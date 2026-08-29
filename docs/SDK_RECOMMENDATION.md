# CallTest SDK Recommendation & Integration Choice — Phase 8.1

## 1. Overview

During application creation and on the developer dashboard, CallTest presents a transparent, non-coercive choice for test participation verification:

1. **Con CallTest SDK (Opción Recomendada)**
2. **Continuar sin CallTest SDK (Totalmente funcional y compatible)**

The objective is to explain clearly to developers how technical telemetry from the CallTest SDK provides automated installation detection and reduces manual screenshot review friction, without penalizing or restricting applications choosing not to integrate the SDK.

---

## 2. UX Flow & Decision Matrix

```
[Developer Registers App / Edits Settings]
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│  ¿Cómo quieres verificar la participación de tus testers? │
└──────────────────────────┬───────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
  [⭐ Con CallTest SDK]           [Continuar sin SDK]
  - Opción recomendada           - Flujo 100% soportado
  - Verificación automática      - Requiere evidencias/capturas
  - Menos revisión manual        - Mayor revisión manual
             │                           │
             ▼                           ▼
  [Muestra Guía de Setup]        [Diálogo de Confirmación]
  - App ID & API Key             - Explica uso de capturas
  - Estados:                     - Confirmar elección
    ○ No verificado              - sdkIntegrationStatus: NO_SDK
    ○ Detectado                          │
    ○ Operativo                          ▼
             │                  [Guardado en Backend]
             ▼
  [sdkIntegrationStatus: SDK_ENABLED]
```

---

## 3. Comparison Matrix

| Función | ⭐ Con CallTest SDK | Continuar sin SDK |
| :--- | :--- | :--- |
| **Instalación** | Automática (`INSTALL_DETECTED`) | Declaración / Evidencia (`INSTALL_CLAIMED`) |
| **Primera apertura** | Automática (`FIRST_OPEN`) | Evidencia / Señales disponibles |
| **Actividad** | Más señales automáticas | Señales disponibles limitadas |
| **Misiones automáticas** | Más posibilidades (`SDK_EVENT`, `SCREEN_FLOW`) | Más limitadas (`MANUAL`, `EVIDENCE`) |
| **Capturas** | Menos necesarias | Más frecuentes |
| **Revisión manual** | Menor | Mayor |
| **Verificación** | Más rápida | Puede requerir revisión humana |
| **Integración** | Requiere SDK | No requiere SDK |
| **Campaña** | Compatible (Regla 12/15) | Compatible (Regla 12/15) |

---

## 4. API Endpoints & State Model

### Data Model
In `prisma/schema.prisma`:
- `sdkIntegrationStatus`: `NOT_CONFIGURED` | `SDK_ENABLED` | `NO_SDK`
- `hasCallTestSdk`: `Boolean` (synchronized with `sdkIntegrationStatus === SDK_ENABLED`)

### Endpoints
- `POST /apps` — Ingests optional `sdkIntegrationStatus` or `hasCallTestSdk`.
- `PATCH /apps/:id` — Updates application fields including `sdkIntegrationStatus`.
- `PATCH /apps/:id/sdk-status` — Dedicated endpoint for updating SDK status.

### Security, Audit & IDOR Protection
- Modifying `sdkIntegrationStatus` requires ownership of the application (`UserRole.DEVELOPER`).
- Testers attempting to modify SDK status receive `403 Forbidden`.
- Any change in SDK status logs `AuditAction.APP_SDK_STATUS_CHANGED` and publishes the `app.sdk_status_changed` domain event.
- Campaign history is never destructively deleted when switching between SDK configurations.
