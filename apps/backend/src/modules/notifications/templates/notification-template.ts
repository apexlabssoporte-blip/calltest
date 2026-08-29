import { NotificationType } from "@calltest/shared-types";

export interface RenderedTemplate {
  title: string;
  body: string;
}

export class NotificationTemplateEngine {
  /**
   * Renders standardized, localization-ready notification messages based on type and context.
   */
  public static render(
    type: NotificationType,
    params: Record<string, unknown> = {},
    _locale = "es",
  ): RenderedTemplate {
    const appName = (params.appName as string) || "tu aplicación";
    const campaignName = (params.campaignName as string) || "tu campaña";
    const missionTitle = (params.missionTitle as string) || "misión";
    const trustRank = (params.trustRank as string) || "actualizado";
    const reputationStatus = (params.reputationStatus as string) || "actualizado";
    const reason = (params.reason as string) || "No cumple los requisitos";

    switch (type) {
      case NotificationType.TESTER_CAMPAIGN_AVAILABLE:
        return {
          title: "Nueva campaña disponible",
          body: `Tienes una nueva campaña de prueba disponible: ${appName}.`,
        };

      case NotificationType.TESTER_MISSION_AVAILABLE:
        return {
          title: "Nueva misión disponible",
          body: `Hay una nueva misión disponible en la campaña ${campaignName}.`,
        };

      case NotificationType.MISSION_COMPLETED:
        return {
          title: "Misión completada",
          body: `Has completado la misión "${missionTitle}" satisfactoriamente.`,
        };

      case NotificationType.MISSION_REMINDER:
        return {
          title: "Recordatorio de misión",
          body: `Tienes misiones pendientes por realizar en ${appName}.`,
        };

      case NotificationType.CAMPAIGN_REMINDER:
        return {
          title: "Recordatorio de prueba",
          body: `Recuerda abrir y utilizar la aplicación ${appName} hoy para mantener tu actividad.`,
        };

      case NotificationType.CAMPAIGN_COMPLETED:
        return {
          title: "Campaña finalizada",
          body: `La campaña de prueba para ${appName} ha finalizado.`,
        };

      case NotificationType.CAMPAIGN_PARTICIPATION_THANK_YOU:
        return {
          title: "¡Gracias por tu participación!",
          body: `Agradecemos tu valiosa contribución como tester en la prueba de ${appName}.`,
        };

      case NotificationType.NEW_TESTER_ASSIGNED:
        return {
          title: "Nuevo tester incorporado",
          body: `Un nuevo tester se ha incorporado a tu campaña ${campaignName}.`,
        };

      case NotificationType.CAMPAIGN_TARGET_REACHED:
        return {
          title: "¡Objetivo alcanzado!",
          body: `Tienes 12 testers activos para tu aplicación ${appName}.`,
        };

      case NotificationType.TESTER_LOW_ACTIVITY:
        return {
          title: "Tester con baja actividad",
          body: `Un tester en tu campaña ${campaignName} tiene poca actividad recientemente.`,
        };

      case NotificationType.TESTER_ABANDONED:
        return {
          title: "Tester marcado como inactivo",
          body: `Un tester ha sido marcado como inactivo/abandonado en tu campaña ${campaignName}.`,
        };

      case NotificationType.TESTER_REPLACEMENT_ASSIGNED:
        return {
          title: "Tester de reemplazo asignado",
          body: `Se ha asignado un tester de reemplazo para mantener los 12 testers activos en ${campaignName}.`,
        };

      case NotificationType.CAMPAIGN_HEALTH_WARNING:
        return {
          title: "Alerta de salud de campaña",
          body: `Tu campaña ${campaignName} ha entrado en estado de advertencia (WARNING).`,
        };

      case NotificationType.CAMPAIGN_HEALTH_CRITICAL:
        return {
          title: "Alerta crítica de campaña",
          body: `La salud de tu campaña ${campaignName} requiere atención operativa inmediata (CRITICAL).`,
        };

      case NotificationType.TRUST_UPDATED:
        return {
          title: "Nivel de confianza actualizado",
          body: `Tu rango de confianza ha sido actualizado a ${trustRank}.`,
        };

      case NotificationType.REPUTATION_UPDATED:
        return {
          title: "Reputación actualizada",
          body: `Tu estado de reputación en la plataforma es ahora ${reputationStatus}.`,
        };

      case NotificationType.EVIDENCE_SUBMITTED:
        return {
          title: "Nueva evidencia enviada",
          body: `Un tester envió nueva evidencia para revisión en ${campaignName}.`,
        };

      case NotificationType.EVIDENCE_APPROVED:
        return {
          title: "Evidencia aprobada",
          body: `Tu evidencia de la misión "${missionTitle}" fue aprobada.`,
        };

      case NotificationType.EVIDENCE_REJECTED:
        return {
          title: "Evidencia rechazada",
          body: `Tu evidencia de la misión "${missionTitle}" fue rechazada. Motivo: ${reason}.`,
        };

      case NotificationType.PARTICIPATION_VERIFIED:
        return {
          title: "Participación verificada",
          body: `Tu participación en la campaña ${campaignName} ha sido verificada correctamente.`,
        };

      case NotificationType.PARTICIPATION_VERIFICATION_PENDING:
        return {
          title: "Verificación pendiente",
          body: `Completa tus misiones o sube evidencias para verificar tu participación en ${campaignName}.`,
        };

      case NotificationType.SYSTEM:
      default:
        return {
          title: (params.title as string) || "Notificación del sistema",
          body: (params.body as string) || "Tienes una nueva notificación de CallTest.",
        };
    }
  }
}
