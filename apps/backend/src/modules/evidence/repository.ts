import { prisma } from "../../core/database/prisma.js";
import { EvidenceStatus, Prisma } from "@prisma/client";

export class EvidenceRepository {
  public static async create(data: Prisma.MissionEvidenceCreateInput) {
    return prisma.missionEvidence.create({
      data,
    });
  }

  public static async findById(id: string) {
    return prisma.missionEvidence.findUnique({
      where: { id },
      include: {
        campaign: {
          include: { app: true },
        },
        mission: true,
        missionAttempt: true,
        tester: true,
        reviewedBy: true,
      },
    });
  }

  public static async findBySha256(sha256: string) {
    return prisma.missionEvidence.findMany({
      where: { sha256 },
    });
  }

  public static async listByCampaign(
    campaignId: string,
    status?: EvidenceStatus,
  ) {
    return prisma.missionEvidence.findMany({
      where: {
        campaignId,
        ...(status ? { status } : {}),
      },
      include: {
        tester: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        mission: {
          select: {
            id: true,
            title: true,
            objective: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });
  }

  public static async listByTester(campaignId: string, testerId: string) {
    return prisma.missionEvidence.findMany({
      where: {
        campaignId,
        testerId,
      },
      include: {
        mission: {
          select: {
            id: true,
            title: true,
            objective: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });
  }

  public static async update(id: string, data: Prisma.MissionEvidenceUpdateInput) {
    return prisma.missionEvidence.update({
      where: { id },
      data,
    });
  }
}
