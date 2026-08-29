# CALLTEST V1 — PHASE 4 REPORT: CAMPAIGN HEALTH + MATCHING ENGINE

**Fecha:** 21 de Agosto de 2026  
**Estado:** COMPLETADO CON ÉXITO (PASS)  
**Proyecto:** `C:\Users\manue\calltest`

---

## 1. RESUMEN EJECUTIVO

La **Fase 4 (Campaign Health + Matching Engine)** ha sido implementada y validada en su totalidad. Se han construido los dos motores independientes requeridos:
1. **`CampaignHealthService`**: Monitorea en tiempo real la salud de las campañas, clasifica niveles de riesgo y determina de forma controlada la necesidad de reemplazos respetando la regla 12/15.
2. **`MatchingEngine`**: Gestiona la progresión de exposición de los testers (`NEW` $\to$ `PROBATION` $\to$ `ESTABLISHED` $\to$ `HIGH_PERFORMER`), protege contra sobrecarga de campañas, impide el auto-testeo de desarrolladores en sus propias aplicaciones, calcula la puntuación compuesta interna y ejecuta asignaciones de reemplazo de forma transaccional, concurrente e idempotente.

### Indicadores de Calidad
* **TypeScript Monorepo Build (`npm run build`):** PASS (0 errores en backend, api-contract y shared-types)
* **ESLint (`npm run lint`):** PASS (0 errores, 0 warnings)
* **Vitest Suite (`npm test`):** 153/153 PASS en 25 archivos de prueba
* **OpenAPI 3.0 Contract:** Actualizado con los endpoints públicos e internos de Fase 4
* **Prisma Engine:** Sincronizado y generado con la entidad `TesterExposureProfile`

---

## 2. CAMPAIGN HEALTH ENGINE: COMPONENTES Y REGLAS

### 2.1 Regla Fundamental 12 / 15 y Cálculo de Reemplazos
* **Objetivo vs Techo:** 12 activos es el objetivo deseado; 15 activos es el límite máximo permitido.
* **`replacementNeed`:**
  * Si $\text{activeTesters} \ge 12 \implies \text{replacementNeed} = 0$.
  * Si $\text{activeTesters} < 12 \implies \text{replacementNeed} = \min(12 - \text{active}, 15 - \text{active})$.
* **Separación de `LOW_ACTIVITY`:**
  * Los testers en `LOW_ACTIVITY` no cuentan como `ACTIVE` ni consumen el cupo de 15 activos.
  * Una campaña con **12 ACTIVE + 5 LOW_ACTIVITY (17 total)** mantiene `replacementNeed = 0` y no sustituye automáticamente a los testers de baja actividad mientras se cumpla el objetivo de 12 activos.

### 2.2 Clasificación de Riesgo (`CampaignRisk`)
* `HEALTHY`: $\ge 12$ activos, tasa de actividad $\ge 60\%$, 0 abandonos.
* `WARNING`: 11 activos o $\ge 12$ activos con $\ge 3$ en `LOW_ACTIVITY`.
* `AT_RISK`: 9–10 activos o $\ge 1$ abandonos confirmados.
* `CRITICAL`: $< 9$ activos o $\ge 3$ abandonos.

---

## 3. MATCHING ENGINE & EXPOSURE MANAGEMENT

### 3.1 Niveles de Exposición y Capacidad (`TesterExposureLevel`)
* `NEW`: Capacidad de **1** campaña activa simultánea.
* `PROBATION`: Capacidad de **2** campañas simultáneas ($\ge 1$ completada, actividad $\ge 60$).
* `ESTABLISHED`: Capacidad de **3** campañas simultáneas ($\ge 3$ completadas, actividad $\ge 75$).
* `HIGH_PERFORMER`: Capacidad de **4** campañas simultáneas ($\ge 6$ completadas, actividad $\ge 85$).
* **Degradación:** Testers con abandono reiterado ($\ge 2$ abandonos o tasa $\ge 40\%$) son degradados hasta `NEW` para mitigar riesgos sin eliminar la cuenta.
* **Exposición $\neq$ Asignación:** La capacidad representa el tope máximo permisible, no una asignación forzada.

### 3.2 Protección contra Auto-Prueba (Self-Testing Rejection)
* **Validación de backend:** Un desarrollador no puede ser asignado como tester a sus propias aplicaciones bajo ninguna circunstancia.
* Los usuarios con rol dual `BOTH` pueden crear sus propias apps y testear apps ajenas, pero son rechazados con `"SELF_TESTING_NOT_ALLOWED"` si intentan participar en sus propias campañas.

### 3.3 Puntuación Compuesta Interna (0 a 100)
El algoritmo clasifica a los candidatos evaluando:
* Desempeño histórico de actividad ($35\%$).
* Tasa de campañas completadas exitosamente ($30\%$).
* Carga activa inversa ($20\%$).
* Nivel de exposición alcanzado ($15\%$).

### 3.4 Concurrencia, Idempotencia y Fechas de Reemplazo
* **Asignación Transaccional (`$transaction`):** Garantiza que múltiples peticiones concurrentes jamás superen el techo de 15 testers activos.
* **Idempotencia:** Evita la duplicación de participaciones si un tester ya está activo en la campaña.
* **Fechas de Reemplazo:** El tester de reemplazo recibe `expectedEndAt = joinedAt + 14 días` desde su incorporación real, preservando el historial anterior del tester que abandonó en estado `ABANDONED`.

---

## 4. MAPA DE ENDPOINTS IMPLEMENTADOS EN FASE 4

| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/campaigns/:campaignId/health` | `DEVELOPER`, `ADMIN` | Consulta de salud de campaña, desglose de testers y nivel de riesgo. |
| `POST` | `/internal/matching/campaigns/:campaignId/evaluate` | `DEVELOPER`, `ADMIN` | Evaluación de salud y ejecución algorítmica transaccional de asignación de reemplazos. |
| `GET` | `/me/exposure` | `TESTER`, `BOTH` | Consulta del nivel de exposición del tester, capacidad máxima y campañas activas. |

---

## 5. RESUMEN DE PRUEBAS AUTOMATIZADAS (153 TESTS)

| Archivo de Prueba | Tests | Cobertura / Objetivo |
| :--- | :---: | :--- |
| `tests/campaign-health.test.ts` | 5 | 12 activos $\to$ HEALTHY/0 reemplazos, 11 activos $\to$ WARNING/1 reemplazo, 10 activos $\to$ AT_RISK/2 reemplazos, 12 activos + 5 low_activity (17 total) $\to$ 0 reemplazos, 14 y 15 activos $\to$ 0 reemplazos. |
| `tests/tester-exposure.test.ts` | 5 | Niveles NEW (1), PROBATION (2), ESTABLISHED (3), HIGH_PERFORMER (4), y democión ante abandonos repetidos. |
| `tests/compatibility-and-load.test.ts` | 4 | Bloqueo de auto-testeo para DEVELOPER y rol BOTH en app propia, admisión de BOTH en apps externas, y bloqueo por exceso de capacidad. |
| `tests/matching-engine.test.ts` | 4 | Ranking de candidatos, asignación de reemplazo con fechas independientes (+14 días), protección de concurrencia (techo de 15 no superable) e idempotencia. |
| `tests/phase4-api-integration.test.ts` | 3 | Flujo HTTP en Fastify para health, matching y exposure endpoints. |
| *Pruebas de Fases Anteriores (Auth, Apps, Campaigns, Missions, Activity, etc.)* | 132 | Regresión limpia y compatibilidad 100%. |
| **TOTAL** | **153** | **100% PASS** |

---

## 6. PRÓXIMOS PASOS (FASE 5)

La plataforma dispone ahora de un ecosistema equilibrado de salud y asignación controlada. En las siguientes fases se integrarán:
1. **Trust Engine:** Cálculo de reputación y penalizaciones a partir de auditorías e historiales consolidados.
2. **Rewards Engine:** Otorgamiento transaccional e idempotente de XP y Gold basado en misiones validadas y desempeño.
3. **Public Availability Verification:** Verificación automatizada de disponibilidad en Google Play Store previo al cierre definitivo de la campaña.

---
*Fin del informe de Fase 4. Detenido a la espera de autorización.*
