# DOMAIN EVENTS & NOTIFICATION POLICIES — CALLTEST V1

## 1. Mapeo de Eventos de Dominio a Notificaciones

El subsistema `NotificationEventSubscribers` escucha eventos de dominio emitidos a través de `DomainEventBus` y ejecuta las políticas correspondientes:

| Evento de Dominio | Destinatario | Tipo de Notificación | Mensaje / Semántica |
| :--- | :--- | :--- | :--- |
| `campaign.health.changed` (`activeTesters: 12`) | Developer | `CAMPAIGN_TARGET_REACHED` | "Tienes 12 testers activos para tu aplicación {appName}." |
| `campaign.health.changed` (`risk: WARNING`) | Developer | `CAMPAIGN_HEALTH_WARNING` | "Tu campaña ha entrado en estado de advertencia (WARNING)." |
| `campaign.health.changed` (`risk: CRITICAL`) | Developer | `CAMPAIGN_HEALTH_CRITICAL` | "Tu campaña requiere atención operativa inmediata (CRITICAL)." |
| `campaign.tester.assigned` | Developer | `NEW_TESTER_ASSIGNED` | "Un nuevo tester se ha incorporado a tu campaña." |
| `campaign.tester.assigned` | Tester | `TESTER_CAMPAIGN_AVAILABLE` | "Tienes una nueva campaña de prueba disponible." |
| `campaign.tester.low_activity` | Developer | `TESTER_LOW_ACTIVITY` | "Un tester en tu campaña presenta baja actividad recientemente." (No equivale a abandono). |
| `campaign.tester.abandoned` | Developer | `TESTER_ABANDONED` | "Un tester ha sido marcado como inactivo/abandonado en tu campaña." |
| `campaign.tester.replacement_assigned` | Developer | `TESTER_REPLACEMENT_ASSIGNED` | "Se ha asignado un tester de reemplazo para tu campaña." |
| `campaign.tester.replacement_assigned` | Replacement Tester | `TESTER_CAMPAIGN_AVAILABLE` | "Tienes una nueva campaña disponible (Reemplazo)." |
| `mission.completed` | Tester | `MISSION_COMPLETED` | "Has completado la misión {missionTitle} satisfactoriamente." |
| `trust.changed` | Tester | `TRUST_UPDATED` | "Tu rango de confianza ha sido actualizado a {trustRank}." (Sin secretos internos). |
| `reputation.changed` | Tester | `REPUTATION_UPDATED` | "Tu estado de reputación en la plataforma es ahora {reputationStatus}." |

---

## 2. Regla Obligatoria: 12 Testers Activos

* Cuando una campaña alcanza `12 ACTIVE`, se emite la notificación `CAMPAIGN_TARGET_REACHED`.
* Se ejecuta con la clave de deduplicación determinística `CAMPAIGN_TARGET_REACHED_${campaignId}_12_active` para evitar alertas repetidas en cada recálculo de salud.

---

## 3. Distinción Estricta entre `LOW_ACTIVITY` y `ABANDONED`

* `LOW_ACTIVITY`: Indica que el tester ha disminuido su ritmo o no ha interactuado recientemente, pero **sigue en la campaña**. La notificación aclara que presenta baja actividad reciente.
* `ABANDONED`: Indica que el tester superó el período de inactividad tolerado y ha salido formalmente de la membresía activa.

---

## 4. Privacidad y Seguridad en Notificaciones

* Las notificaciones a desarrolladores **nunca** exponen datos sensibles de los testers (IP, modelo de hardware, score de fraude, auditoría interna).
* Las notificaciones a testers sobre Trust y Reputación informan su rango y estado de manera segura sin exponer la lógica algorítmica de antifraude.
