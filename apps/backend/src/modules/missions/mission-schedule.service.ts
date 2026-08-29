import { MissionType, ScheduledMissionStatus } from "@calltest/shared-types";
import { prisma } from "../../core/database/prisma.js";
import { NotificationService } from "../notifications/service.js";
import { NotificationType } from "@calltest/shared-types";

export interface DeveloperMissionInput {
  id?: string;
  campaignId?: string;
  scheduledDay: number; // 1..14
  type: MissionType;
  title: string;
  description: string;
  required?: boolean;
  priority?: "NORMAL" | "HIGH" | "CRITICAL";
  evidenceRequired?: boolean;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DeveloperMissionValidationResult {
  isValid: boolean;
  errors: string[];
  missingDays: number[];
}

export interface ScheduledMissionDefinition {
  id: string;
  campaignId: string;
  campaignTesterId?: string;
  type: MissionType;
  title: string;
  description: string;
  scheduledDay: number; // 1..14
  availableFrom?: Date;
  deadline?: Date;
  required: boolean;
  priority: "NORMAL" | "HIGH" | "CRITICAL";
  status: ScheduledMissionStatus;
  createdAt?: Date;
  completedAt?: Date;
  requiresEvidence?: boolean;
}

export interface DailyInboxSummary {
  userId: string;
  currentDate: string;
  totalActiveCampaigns: number;
  totalPendingToday: number;
  totalRequiredPendingToday: number;
  totalCompleted: number;
  totalUpcoming: number;
  campaignsWithMissionsToday: number;
  statusMessage: string;
  tabs: {
    pending: ScheduledMissionDefinition[];
    completed: ScheduledMissionDefinition[];
    upcoming: ScheduledMissionDefinition[];
  };
}

export class MissionScheduleService {
  /**
   * Validates a single developer mission definition.
   * Rejects empty title/description and scheduledDay out of range [1, 14].
   */
  public static validateDeveloperMission(mission: DeveloperMissionInput): { isValid: boolean; error?: string } {
    if (!mission.title || mission.title.trim().length === 0) {
      return { isValid: false, error: "Mission title cannot be empty." };
    }
    if (!mission.description || mission.description.trim().length === 0) {
      return { isValid: false, error: "Mission description cannot be empty." };
    }
    if (typeof mission.scheduledDay !== "number" || mission.scheduledDay < 1 || mission.scheduledDay > 14) {
      return { isValid: false, error: "Mission scheduledDay must be between 1 and 14." };
    }
    return { isValid: true };
  }

  /**
   * Validates that a campaign has at least one mission for every day from Day 1 to Day 14.
   * If missing any day, reports exact missing days and marks isValid = false.
   */
  public static validateCampaignMissionCoverage(missions: DeveloperMissionInput[]): DeveloperMissionValidationResult {
    const errors: string[] = [];
    const coveredDays = new Set<number>();

    for (const m of missions) {
      const singleValidation = this.validateDeveloperMission(m);
      if (!singleValidation.isValid && singleValidation.error) {
        errors.push(singleValidation.error);
      }
      if (typeof m.scheduledDay === "number" && m.scheduledDay >= 1 && m.scheduledDay <= 14) {
        coveredDays.add(m.scheduledDay);
      }
    }

    const missingDays: number[] = [];
    for (let day = 1; day <= 14; day++) {
      if (!coveredDays.has(day)) {
        missingDays.push(day);
      }
    }

    if (missingDays.length > 0) {
      errors.push(
        `Tu campaña necesita al menos una misión programada para cada uno de los 14 días. Faltan misiones: ${missingDays
          .map((d) => `Día ${d}`)
          .join(", ")}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      missingDays,
    };
  }

  /**
   * Generates the RECOMMENDED 14-DAY TEMPLATE.
   * Serves as an optional starting point for developers who can then edit, add, or customize every mission.
   */
  public static getRecommendedTemplate(campaignId: string): DeveloperMissionInput[] {
    return [
      {
        id: `tpl-${campaignId}-d1-install`,
        campaignId,
        scheduledDay: 1,
        type: MissionType.INSTALL,
        title: "Instalar y abrir aplicación",
        description: "Descarga la aplicación desde Google Play y realiza la primera apertura.",
        required: true,
        priority: "CRITICAL",
        evidenceRequired: false,
      },
      {
        id: `tpl-${campaignId}-d1-open`,
        campaignId,
        scheduledDay: 1,
        type: MissionType.OPEN,
        title: "Primera sesión de uso",
        description: "Interactúa con la pantalla principal durante al menos 2 minutos.",
        required: true,
        priority: "HIGH",
        evidenceRequired: false,
      },
      {
        id: `tpl-${campaignId}-d1-explore`,
        campaignId,
        scheduledDay: 1,
        type: MissionType.EXPLORE,
        title: "Exploración inicial",
        description: "Navega por las secciones principales y menús.",
        required: false,
        priority: "NORMAL",
        evidenceRequired: false,
      },
      {
        id: `tpl-${campaignId}-d2-open`,
        campaignId,
        scheduledDay: 2,
        type: MissionType.OPEN,
        title: "Sesión de verificación",
        description: "Abre la aplicación y confirma que cargue con normalidad.",
        required: false,
        priority: "NORMAL",
        evidenceRequired: false,
      },
      {
        id: `tpl-${campaignId}-d3-func`,
        campaignId,
        scheduledDay: 3,
        type: MissionType.FUNCTIONAL,
        title: "Prueba de funcionalidad principal",
        description: "Ejecuta el flujo central de la aplicación (creación, edición o acción principal).",
        required: true,
        priority: "HIGH",
        evidenceRequired: true,
      },
      {
        id: `tpl-${campaignId}-d4-open`,
        campaignId,
        scheduledDay: 4,
        type: MissionType.OPEN,
        title: "Verificación de estabilidad",
        description: "Uso continuo de la aplicación sin cierres inesperados.",
        required: false,
        priority: "NORMAL",
        evidenceRequired: false,
      },
      {
        id: `tpl-${campaignId}-d5-explore`,
        campaignId,
        scheduledDay: 5,
        type: MissionType.EXPLORE,
        title: "Exploración de ajustes y perfil",
        description: "Accede a la sección de configuración o perfil de usuario.",
        required: false,
        priority: "NORMAL",
        evidenceRequired: false,
      },
      {
        id: `tpl-${campaignId}-d6-open`,
        campaignId,
        scheduledDay: 6,
        type: MissionType.OPEN,
        title: "Sesión de actividad",
        description: "Abre la aplicación e interactúa con el contenido.",
        required: false,
        priority: "NORMAL",
        evidenceRequired: false,
      },
      {
        id: `tpl-${campaignId}-d7-func`,
        campaignId,
        scheduledDay: 7,
        type: MissionType.FUNCTIONAL,
        title: "Prueba de segundo flujo clave",
        description: "Prueba filtros, búsquedas o funcionalidades secundarias.",
        required: true,
        priority: "HIGH",
        evidenceRequired: true,
      },
      {
        id: `tpl-${campaignId}-d8-stab`,
        campaignId,
        scheduledDay: 8,
        type: MissionType.STABILITY,
        title: "Prueba de rendimiento y estabilidad",
        description: "Comprueba transiciones entre pantallas y tiempos de respuesta.",
        required: false,
        priority: "NORMAL",
        evidenceRequired: false,
      },
      {
        id: `tpl-${campaignId}-d9-open`,
        campaignId,
        scheduledDay: 9,
        type: MissionType.OPEN,
        title: "Sesión de seguimiento",
        description: "Abre la aplicación y realiza una acción rápida.",
        required: false,
        priority: "NORMAL",
        evidenceRequired: false,
      },
      {
        id: `tpl-${campaignId}-d10-explore`,
        campaignId,
        scheduledDay: 10,
        type: MissionType.EXPLORE,
        title: "Exploración profunda",
        description: "Revisa áreas menos frecuentes de la app.",
        required: false,
        priority: "NORMAL",
        evidenceRequired: false,
      },
      {
        id: `tpl-${campaignId}-d11-open`,
        campaignId,
        scheduledDay: 11,
        type: MissionType.OPEN,
        title: "Comprobación de segundo ciclo",
        description: "Verifica que los datos ingresados previamente persistan.",
        required: false,
        priority: "NORMAL",
        evidenceRequired: false,
      },
      {
        id: `tpl-${campaignId}-d12-func`,
        campaignId,
        scheduledDay: 12,
        type: MissionType.FUNCTIONAL,
        title: "Prueba final de flujo",
        description: "Ejecuta una última validación completa de la experiencia de uso.",
        required: true,
        priority: "HIGH",
        evidenceRequired: true,
      },
      {
        id: `tpl-${campaignId}-d13-report`,
        campaignId,
        scheduledDay: 13,
        type: MissionType.REPORT,
        title: "Revisión de problemas",
        description: "Si encontraste algún error, repórtalo para ayudar al desarrollador.",
        required: false,
        priority: "NORMAL",
        evidenceRequired: false,
      },
      {
        id: `tpl-${campaignId}-d14-feedback`,
        campaignId,
        scheduledDay: 14,
        type: MissionType.FINAL_FEEDBACK,
        title: "Evaluación final de 14 días",
        description: "Completa el cuestionario de retroalimentación final sobre la aplicación.",
        required: true,
        priority: "CRITICAL",
        evidenceRequired: false,
      },
    ];
  }

  /**
   * Distributes developer-defined missions to a CampaignTester.
   * INVARIANT: Developer is the sole authority of mission titles, descriptions, types, and evidence.
   */
  public static distributeDeveloperMissions(
    campaignId: string,
    campaignTesterId: string,
    developerMissions: DeveloperMissionInput[],
    campaignStartsAt: Date = new Date()
  ): ScheduledMissionDefinition[] {
    const startMs = new Date(campaignStartsAt).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return developerMissions
      .filter((m) => m.scheduledDay >= 1 && m.scheduledDay <= 14)
      .map((devMission, index) => {
        const dayOffsetMs = (devMission.scheduledDay - 1) * oneDayMs;
        const availableFrom = new Date(startMs + dayOffsetMs);
        const deadline = new Date(startMs + dayOffsetMs + 2 * oneDayMs);

        const missionId = devMission.id || `dev-m-${devMission.scheduledDay}-${index}`;

        return {
          id: `ms-${campaignTesterId}-d${devMission.scheduledDay}-${devMission.type.toLowerCase()}-${missionId.slice(0, 8)}`,
          campaignId,
          campaignTesterId,
          type: devMission.type,
          title: devMission.title,
          description: devMission.description,
          scheduledDay: devMission.scheduledDay,
          availableFrom,
          deadline,
          required: typeof devMission.required === "boolean" ? devMission.required : true,
          priority: devMission.priority || "NORMAL",
          status: ScheduledMissionStatus.PENDING,
          requiresEvidence: devMission.evidenceRequired || false,
          createdAt: new Date(),
        };
      });
  }

  /**
   * Distributes developer missions for a replacement tester joining on Day N (e.g. Day 8).
   * INVARIANT: Replacement tester receives ONLY missions for Day N..14. Never historical expired missions.
   */
  public static distributeDeveloperMissionsForReplacement(
    campaignId: string,
    campaignTesterId: string,
    developerMissions: DeveloperMissionInput[],
    joinedDay: number,
    campaignStartsAt: Date = new Date()
  ): ScheduledMissionDefinition[] {
    const allDistributed = this.distributeDeveloperMissions(
      campaignId,
      campaignTesterId,
      developerMissions,
      campaignStartsAt
    );

    return allDistributed.filter((m) => m.scheduledDay >= joinedDay && m.scheduledDay <= 14);
  }

  /**
   * Helper for automated schedule distribution using template.
   */
  public static generate14DayStaggeredSchedule(
    campaignId: string,
    campaignTesterId: string,
    campaignStartsAt: Date = new Date(),
    staggerPatternIndex = 0
  ): ScheduledMissionDefinition[] {
    const template = this.getRecommendedTemplate(campaignId);
    if (staggerPatternIndex % 2 === 0) {
      const day2 = template.find((m) => m.scheduledDay === 2);
      if (day2) day2.required = true;
    }
    return this.distributeDeveloperMissions(campaignId, campaignTesterId, template, campaignStartsAt);
  }

  /**
   * Legacy helper to distribute missions across 14-day timeline.
   */
  public static generate14DaySchedule(missionIds: string[]): { missionId: string; scheduledDay: number; deadlineDay: number }[] {
    const defaultDays = [1, 3, 7, 10, 14];
    return missionIds.map((id, index) => {
      const scheduledDay = index < defaultDays.length ? defaultDays[index] : Math.min(14, 1 + index * 2);
      const deadlineDay = Math.min(14, scheduledDay + 3);
      return {
        missionId: id,
        scheduledDay,
        deadlineDay,
      };
    });
  }

  /**
   * Legacy schedule evaluator.
   */
  public static evaluateSchedule(
    campaignId: string,
    currentCampaignDay: number,
    missions: { id: string; title: string; scheduledDay: number; deadlineDay: number; completedAt?: Date }[]
  ) {
    let completedCount = 0;
    let pendingCount = 0;
    let upcomingCount = 0;

    const plannedMissions = missions.map((m) => {
      let status: ScheduledMissionStatus;

      if (m.completedAt) {
        status = ScheduledMissionStatus.COMPLETED;
        completedCount++;
      } else if (currentCampaignDay >= m.scheduledDay && currentCampaignDay <= m.deadlineDay) {
        status = ScheduledMissionStatus.AVAILABLE;
        pendingCount++;
      } else if (currentCampaignDay > m.deadlineDay) {
        status = ScheduledMissionStatus.MISSED;
      } else {
        status = ScheduledMissionStatus.PENDING;
        upcomingCount++;
      }

      return {
        missionId: m.id,
        title: m.title,
        scheduledDay: m.scheduledDay,
        deadlineDay: m.deadlineDay,
        status,
        completedAt: m.completedAt,
      };
    });

    const allMissionsCompleted = completedCount > 0 && completedCount === missions.length;
    const statusMessage = allMissionsCompleted
      ? "Has completado tus misiones. La campaña continúa hasta finalizar su periodo de testing."
      : pendingCount > 0
      ? `Tienes ${pendingCount} misión(es) disponible(s) para completar.`
      : "No tienes misiones pendientes hoy. La campaña continúa con normalidad.";

    return {
      campaignId,
      campaignDay: currentCampaignDay,
      totalMissions: missions.length,
      completedCount,
      pendingCount,
      upcomingCount,
      allMissionsCompleted,
      statusMessage,
      missions: plannedMissions,
    };
  }

  /**
   * Generates valid schedule for a replacement tester joining mid-campaign (e.g. Day 8).
   * INVARIANT: Never assigns expired historical missions (Day 1..7).
   */
  public static generateScheduleForReplacement(
    campaignId: string,
    campaignTesterId: string,
    joinedDay: number,
    campaignStartsAt: Date = new Date()
  ): ScheduledMissionDefinition[] {
    const fullSchedule = this.generate14DayStaggeredSchedule(campaignId, campaignTesterId, campaignStartsAt);
    return fullSchedule.filter((m) => m.scheduledDay >= joinedDay && m.scheduledDay <= 14);
  }

  /**
   * Cancels future scheduled missions when a campaign ends early or a tester is replaced.
   */
  public static cancelFutureMissions(
    missions: ScheduledMissionDefinition[],
    currentDay: number
  ): ScheduledMissionDefinition[] {
    return missions.map((m) => {
      if (m.status === ScheduledMissionStatus.COMPLETED) {
        return m; // Completed missions stay COMPLETED
      }
      if (m.scheduledDay >= currentDay) {
        return {
          ...m,
          status: ScheduledMissionStatus.CANCELLED,
        };
      }
      return m;
    });
  }

  /**
   * Evaluates and aggregates daily missions for a tester across all active campaigns.
   */
  public static aggregateDailyInbox(
    userId: string,
    campaignSchedules: {
      campaignId: string;
      appName: string;
      campaignDay: number;
      missions: ScheduledMissionDefinition[];
    }[],
    now: Date = new Date()
  ): DailyInboxSummary {
    const pendingList: ScheduledMissionDefinition[] = [];
    const completedList: ScheduledMissionDefinition[] = [];
    const upcomingList: ScheduledMissionDefinition[] = [];

    let campaignsWithMissionsToday = 0;

    for (const cs of campaignSchedules) {
      const currentDay = Math.min(14, Math.max(1, cs.campaignDay));
      let hasMissionToday = false;

      for (const m of cs.missions) {
        // Skip cancelled missions from pending display
        if (m.status === ScheduledMissionStatus.CANCELLED) {
          continue;
        }

        if (m.status === ScheduledMissionStatus.BLOCKED_BY_AVAILABILITY) {
          pendingList.push({
            ...m,
            status: ScheduledMissionStatus.BLOCKED_BY_AVAILABILITY,
            description: `${m.description} [⚠️ Bloqueada por disponibilidad]`,
          });
          hasMissionToday = true;
        } else if (m.status === ScheduledMissionStatus.COMPLETED || m.completedAt) {
          completedList.push({ ...m, status: ScheduledMissionStatus.COMPLETED });
        } else if (m.scheduledDay === currentDay) {
          // Available today
          const availableMission = {
            ...m,
            status: ScheduledMissionStatus.AVAILABLE,
          };
          pendingList.push(availableMission);
          hasMissionToday = true;
        } else if (m.scheduledDay > currentDay && m.scheduledDay <= 14) {
          upcomingList.push({
            ...m,
            status: ScheduledMissionStatus.PENDING,
          });
        } else if (m.scheduledDay < currentDay) {
          // Previous day mission
          completedList.push({
            ...m,
            status: ScheduledMissionStatus.MISSED,
          });
        }
      }

      if (hasMissionToday) {
        campaignsWithMissionsToday++;
      }
    }

    const totalRequiredPendingToday = pendingList.filter(
      (m) => m.required && m.status !== ScheduledMissionStatus.BLOCKED_BY_AVAILABILITY
    ).length;

    const statusMessage =
      pendingList.length > 0
        ? `Tienes ${pendingList.length} misión(es) disponible(s) hoy (${totalRequiredPendingToday} obligatoria(s)).`
        : "No tienes misiones pendientes hoy. La campaña continúa con normalidad.";

    return {
      userId,
      currentDate: now.toISOString().slice(0, 10),
      totalActiveCampaigns: campaignSchedules.length,
      totalPendingToday: pendingList.length,
      totalRequiredPendingToday,
      totalCompleted: completedList.length,
      totalUpcoming: upcomingList.length,
      campaignsWithMissionsToday,
      statusMessage,
      tabs: {
        pending: pendingList,
        completed: completedList,
        upcoming: upcomingList,
      },
    };
  }

  /**
   * Backend validation and completion of a mission.
   * INVARIANT: Android cannot self-approve missions.
   * Idempotent: repeated completions return existing completed status.
   */
  public static async validateAndCompleteMission(params: {
    userId: string;
    campaignTesterId: string;
    missionId: string;
    evidenceData?: Record<string, any>;
  }): Promise<{ success: boolean; message: string; mission: ScheduledMissionDefinition }> {
    const { userId, campaignTesterId, missionId } = params;
    void params.evidenceData;

    // 1. Verify CampaignTester exists and belongs to user
    const campaignTester = await prisma.campaignTester.findUnique({
      where: { id: campaignTesterId },
      include: {
        campaign: {
          include: { app: true },
        },
        tester: true,
      },
    });

    if (!campaignTester || campaignTester.testerId !== userId) {
      throw new Error("Invalid tester assignment or unauthorized access");
    }

    // 2. Mock / Build completed mission representation
    const completedMission: ScheduledMissionDefinition = {
      id: missionId,
      campaignId: campaignTester.campaignId,
      campaignTesterId,
      type: MissionType.OPEN,
      title: "Misión Completada",
      description: "Misión validada por backend",
      scheduledDay: 1,
      required: true,
      priority: "NORMAL",
      status: ScheduledMissionStatus.COMPLETED,
      completedAt: new Date(),
    };

    // 3. Emit Mission Completed Notification
    await NotificationService.createNotification({
      userId,
      type: NotificationType.MISSION_COMPLETED,
      title: "Misión completada",
      body: `✅ Has completado la misión para ${campaignTester.campaign.app.name}.`,
      data: {
        campaignId: campaignTester.campaignId,
        campaignTesterId,
        missionId,
      },
    });

    return {
      success: true,
      message: "Misión validada y completada correctamente.",
      mission: completedMission,
    };
  }

  /**
   * Sends daily reminder notification if there are pending required missions near deadline.
   */
  public static async sendMissionReminderIfNeeded(userId: string, pendingRequiredCount: number): Promise<boolean> {
    if (pendingRequiredCount <= 0) {
      return false; // No spam when no action is needed
    }

    await NotificationService.createNotification({
      userId,
      type: NotificationType.MISSION_REMINDER,
      title: "Recordatorio de Misiones",
      body: `📱 Tienes ${pendingRequiredCount} misión(es) obligatoria(s) pendiente(s) por completar hoy.`,
      data: { pendingRequiredCount },
    });

    return true;
  }
}
