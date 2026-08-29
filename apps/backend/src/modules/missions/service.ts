import { prisma } from "../../core/database/prisma.js";
import { verifyCampaignOwnership } from "../../core/middlewares/rbac-guard.js";
import { MissionQualityService } from "./quality-service.js";
import { TemplateMissionGenerator } from "./generator-interface.js";
import { AuditService } from "../../core/services/audit-service.js";
import {
  BadRequestError,
  NotFoundError,
} from "../../core/errors/app-error.js";
import {
  AuditAction,
  MissionDifficulty,
  MissionStatus,
  UserRole,
  ValidationMethod,
} from "@calltest/shared-types";
import {
  CreateMissionRequest,
  UpdateMissionRequest,
  GenerateMissionsRequest,
} from "./schemas.js";

export class MissionService {
  private static readonly generator = new TemplateMissionGenerator();

  /**
   * Creates a single mission for a campaign after passing quality validation.
   */
  public static async createMission(
    campaignId: string,
    developerId: string,
    userRole: UserRole,
    data: CreateMissionRequest,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    await verifyCampaignOwnership(campaignId, developerId, userRole);

    const estimatedMinutes = data.estimatedMinutes ?? 15;
    const difficulty = data.difficulty ?? MissionDifficulty.MEDIUM;
    const validationMethod = data.validationMethod ?? ValidationMethod.SDK_EVENT;

    // Quality gate assessment
    const quality = MissionQualityService.assessQuality({
      title: data.title,
      objective: data.objective,
      steps: data.steps,
      estimatedMinutes,
    });

    if (quality.status === "REJECTED") {
      throw new BadRequestError(
        `Mission quality rejection (${quality.reason}): ${quality.details?.join(" ")}`,
      );
    }

    const mission = await prisma.mission.create({
      data: {
        campaignId,
        title: data.title.trim(),
        description: data.description?.trim(),
        objective: data.objective.trim(),
        steps: data.steps,
        difficulty,
        estimatedMinutes,
        validationMethod,
        requiresEvidence: data.requiresEvidence ?? false,
        evidenceInstructions: data.evidenceInstructions?.trim() || null,
        status: MissionStatus.DRAFT,
      },
    });

    await AuditService.log({
      userId: developerId,
      campaignId,
      action: AuditAction.MISSION_CREATED,
      entityName: "Mission",
      entityId: mission.id,
      changes: { title: mission.title, difficulty, estimatedMinutes },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return mission;
  }

  /**
   * Generates mission drafts using the decoupled MissionGenerator interface.
   * Adapts evidence requirements based on whether app includes CallTest SDK.
   * All generated drafts start in PENDING_REVIEW status.
   */
  public static async generateMissions(
    campaignId: string,
    developerId: string,
    userRole: UserRole,
    input: GenerateMissionsRequest,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    await verifyCampaignOwnership(campaignId, developerId, userRole);

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { app: true },
    });

    const hasSdk = campaign?.app.hasCallTestSdk ?? false;

    const drafts = await this.generator.generateMissions({
      ...input,
      hasCallTestSdk: hasSdk,
    });
    const createdMissions = [];

    for (const draft of drafts) {
      const quality = MissionQualityService.assessQuality(draft);
      if (quality.status !== "REJECTED") {
        const mission = await prisma.mission.create({
          data: {
            campaignId,
            title: draft.title,
            description: draft.description,
            objective: draft.objective,
            steps: draft.steps,
            difficulty: draft.difficulty,
            estimatedMinutes: draft.estimatedMinutes,
            validationMethod: draft.validationMethod,
            requiresEvidence: draft.requiresEvidence ?? false,
            evidenceInstructions: draft.evidenceInstructions || null,
            status: MissionStatus.PENDING_REVIEW,
          },
        });
        createdMissions.push(mission);
      }
    }

    await AuditService.log({
      userId: developerId,
      campaignId,
      action: AuditAction.MISSION_CREATED,
      entityName: "Mission",
      entityId: campaignId,
      changes: { count: createdMissions.length, source: "GENERATOR" },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return createdMissions;
  }

  /**
   * Retrieves a mission by ID.
   */
  public static async getMissionById(missionId: string) {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new NotFoundError("Mission not found");
    }

    return mission;
  }

  /**
   * Lists missions for a campaign.
   */
  public static async listCampaignMissions(
    campaignId: string,
    userRole: UserRole,
  ) {
    if (userRole === UserRole.TESTER) {
      return prisma.mission.findMany({
        where: {
          campaignId,
          status: {
            in: [MissionStatus.APPROVED, MissionStatus.ACTIVE, MissionStatus.COMPLETED],
          },
        },
        orderBy: { createdAt: "asc" },
      });
    }

    return prisma.mission.findMany({
      where: { campaignId },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Updates mission properties and runs quality validation if steps/times change.
   */
  public static async updateMission(
    missionId: string,
    developerId: string,
    userRole: UserRole,
    data: UpdateMissionRequest,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const mission = await this.getMissionById(missionId);
    await verifyCampaignOwnership(mission.campaignId, developerId, userRole);

    const title = data.title ?? mission.title;
    const objective = data.objective ?? mission.objective;
    const steps = (data.steps as string[]) ?? (mission.steps as string[]);
    const estimatedMinutes = data.estimatedMinutes ?? mission.estimatedMinutes;

    if (data.steps || data.objective || data.estimatedMinutes || data.title) {
      const quality = MissionQualityService.assessQuality({
        title,
        objective,
        steps,
        estimatedMinutes,
      });

      if (quality.status === "REJECTED") {
        throw new BadRequestError(
          `Mission quality rejection (${quality.reason}): ${quality.details?.join(" ")}`,
        );
      }
    }

    const updated = await prisma.mission.update({
      where: { id: missionId },
      data: {
        title: data.title ? data.title.trim() : undefined,
        description: data.description !== undefined ? data.description?.trim() : undefined,
        objective: data.objective ? data.objective.trim() : undefined,
        steps: data.steps ? data.steps : undefined,
        difficulty: data.difficulty,
        estimatedMinutes: data.estimatedMinutes,
        validationMethod: data.validationMethod,
        requiresEvidence: data.requiresEvidence !== undefined ? data.requiresEvidence : undefined,
        evidenceInstructions:
          data.evidenceInstructions !== undefined ? data.evidenceInstructions?.trim() || null : undefined,
        status: data.status,
      },
    });

    await AuditService.log({
      userId: developerId,
      campaignId: mission.campaignId,
      action: AuditAction.MISSION_UPDATED,
      entityName: "Mission",
      entityId: missionId,
      changes: data as Record<string, unknown>,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return updated;
  }

  /**
   * Approves a mission in PENDING_REVIEW or DRAFT to APPROVED status.
   */
  public static async approveMission(
    missionId: string,
    developerId: string,
    userRole: UserRole,
    reason?: string,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const mission = await this.getMissionById(missionId);
    await verifyCampaignOwnership(mission.campaignId, developerId, userRole);

    if (mission.status !== MissionStatus.PENDING_REVIEW && mission.status !== MissionStatus.DRAFT) {
      throw new BadRequestError(`Cannot approve mission in status: ${mission.status}`);
    }

    const updated = await prisma.mission.update({
      where: { id: missionId },
      data: { status: MissionStatus.APPROVED },
    });

    await AuditService.log({
      userId: developerId,
      campaignId: mission.campaignId,
      action: AuditAction.MISSION_APPROVED,
      entityName: "Mission",
      entityId: missionId,
      changes: { previousStatus: mission.status, newStatus: MissionStatus.APPROVED, reason },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return updated;
  }

  /**
   * Rejects a mission in PENDING_REVIEW or DRAFT.
   */
  public static async rejectMission(
    missionId: string,
    developerId: string,
    userRole: UserRole,
    reason: string,
    context?: { ipAddress?: string; userAgent?: string },
  ) {
    const mission = await this.getMissionById(missionId);
    await verifyCampaignOwnership(mission.campaignId, developerId, userRole);

    const updated = await prisma.mission.update({
      where: { id: missionId },
      data: { status: MissionStatus.REJECTED },
    });

    await AuditService.log({
      userId: developerId,
      campaignId: mission.campaignId,
      action: AuditAction.MISSION_REJECTED,
      entityName: "Mission",
      entityId: missionId,
      changes: { previousStatus: mission.status, newStatus: MissionStatus.REJECTED, reason },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return updated;
  }
}
