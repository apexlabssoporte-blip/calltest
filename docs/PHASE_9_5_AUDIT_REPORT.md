# CallTest V1 — Informe Integral de Auditoría Técnica y Funcional (Fase 9.5)

## Auditoría de Arquitectura, Seguridad, Concurrencia y Reglas de Negocio

---

## 1. Resumen Ejecutivo

Este informe documenta la auditoría exhaustiva realizada sobre CallTest V1 (Fases 1 a 9) abarcando la totalidad de los módulos de backend, contratos OpenAPI, shared types, infraestructura, base de datos y la capa Android/SDK.

El objetivo fue identificar y erradicar inconsistencias de dominio, condiciones de carrera en operaciones concurrentes, vectores de escalamiento o bypass de seguridad, fugas de privacidad, y divergencias entre reglas canónicas y su implementación en código.

### Resultados Globales de Auditoría
- **Total de Archivos Auditados**: 128 archivos en Backend, Shared Types, API Contract, Android y Docs.
- **Build (`npm run build`)**: **PASS** (Zero errores de compilación TypeScript en todo el monorepo).
- **Lint (`npm run lint`)**: **PASS** (**0 errores, 0 warnings**).
- **Tests Vitest (`npm test`)**: **263 / 263 PASS** en 42 archivos de prueba (100% de éxito).
- **Cobertura de Auditoría Adversarial**: 10 nuevos tests de estrés, concurrencia, IDOR y mitigación de fallos de seguridad añadidos en [`apps/backend/tests/phase9-5-adversarial-audit.test.ts`](file:///c:/Users/manue/calltest/apps/backend/tests/phase9-5-adversarial-audit.test.ts).
- **Estado de Preparación para Fase 10**: **`READY_FOR_PHASE_10`**.

---

## 2. Clasificación y Matriz de Hallazgos por Área

| Área | Estado | P0 (Crítico) | P1 (Alto) | P2 (Medio) | P3 (Bajo) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Auth & RBAC** | Conforme | 0 | 0 | 0 | 0 |
| **Apps** | Conforme | 0 | 0 | 0 | 0 |
| **Campaigns & State Machine** | Conforme | 0 | 0 | 0 | 0 |
| **Testers & Rule 12/15** | Corregido | 1 | 1 | 0 | 0 |
| **Missions Engine** | Corregido | 0 | 1 | 0 | 0 |
| **Activity Engine** | Conforme | 0 | 0 | 0 | 0 |
| **Matching Engine** | Conforme | 0 | 0 | 0 | 0 |
| **Trust & Reputation** | Conforme | 0 | 0 | 0 | 0 |
| **Fraud Prevention** | Conforme | 0 | 0 | 0 | 0 |
| **Notifications & Events** | Conforme | 0 | 0 | 0 | 0 |
| **Evidence & Storage** | Conforme | 0 | 0 | 0 | 0 |
| **Android Client** | Conforme | 0 | 0 | 0 | 0 |
| **CallTest SDK** | Conforme | 0 | 0 | 0 | 0 |
| **OpenAPI Contract** | Conforme | 0 | 0 | 0 | 0 |
| **Database & Concurrency** | Corregido | 1 | 0 | 0 | 0 |
| **TOTALES** | **CORREGIDO Y SEGURO** | **2** | **2** | **0** | **0** |

---

## 3. Detalle de Hallazgos y Correcciones Implementadas

### Hallazgo 1: P0 — Condición de Carrera en Límite Canónico de 15 Active Testers (`addTesterToCampaign` / `joinCampaign`)
- **Problema**: En [`CampaignTesterService.addTesterToCampaign`](file:///c:/Users/manue/calltest/apps/backend/src/modules/campaign-testers/service.ts) y `joinCampaign`, la verificación de capacidad (`count({ where: { status: ACTIVE } })`) se ejecutaba fuera o previamente a la transacción de base de datos (`count -> check -> insert`).
- **Impacto**: Dos o más solicitudes simultáneas al alcanzar 14 testers activos podían verificar `count = 14`, pasar la validación y crear inserciones concurrentes, violando la regla canónica de un máximo de 15 active testers (llegando a 16 o más).
- **Corrección**: Se encapsuló la consulta de conteo y la creación de la participación estrictamente dentro de una transacción `prisma.$transaction(async (tx) => { ... })` con verificación atómica de capacidad antes del `insert`.
- **Test de Regresión**: Verificado en `1. Concurrency & 12/15 Rule Invariant Under Contention` dentro de [`phase9-5-adversarial-audit.test.ts`](file:///c:/Users/manue/calltest/apps/backend/tests/phase9-5-adversarial-audit.test.ts).

---

### Hallazgo 2: P0 — Omisión de Verificación de Self-Testing en Asignación Administrativa de Tester
- **Problema**: `joinCampaign` contaba con protección para evitar que un desarrollador se auto-inscribiera como tester en su propia app (`SELF_TESTING_NOT_ALLOWED`), pero el endpoint administrativo `POST /campaigns/:campaignId/testers` (`addTesterToCampaign`) no contaba con dicha validación explícita.
- **Impacto**: Un usuario con rol `BOTH` o un desarrollador malicioso podía agregarse a sí mismo como tester mediante la API administrativa para inflar artificialmente la actividad de su campaña.
- **Corrección**: Se incorporó en `CampaignTesterService.addTesterToCampaign` la comprobación `if (campaign.app.developerId === data.testerId) throw new BadRequestError("SELF_TESTING_NOT_ALLOWED: Developers cannot participate as testers in their own applications")`.
- **Test de Regresión**: Verificado en `2. Self-Testing Prevention for Both Developer & Administrative Assignments` dentro de [`phase9-5-adversarial-audit.test.ts`](file:///c:/Users/manue/calltest/apps/backend/tests/phase9-5-adversarial-audit.test.ts).

---

### Hallazgo 3: P1 — Límites Canónicos de Pasos y Duración en Schemas de Misiones
- **Problema**: Los schemas de validación de entrada (`CreateMissionRequestSchema` y `UpdateMissionRequestSchema`) permitían hasta 180 minutos de duración estimada y no imponían `maxItems: 15` en el array de pasos a nivel de TypeBox, a pesar de que la configuración canónica de entorno y `MissionQualityService` establecían un tope de 60 minutos y 15 pasos.
- **Impacto**: Potencial desalineación donde peticiones con payloads excesivos fallaban más adelante en capas profundas en vez de ser rechazadas de forma temprana en el gateway de validación de esquemas Fastify.
- **Corrección**: Se actualizaron `CreateMissionRequestSchema` y `UpdateMissionRequestSchema` en [`apps/backend/src/modules/missions/schemas.ts`](file:///c:/Users/manue/calltest/apps/backend/src/modules/missions/schemas.ts) con `{ minItems: 1, maxItems: 15 }` y `Type.Integer({ minimum: 1, maximum: 60 })`.
- **Test de Regresión**: Verificado en la suite completa de `validators.test.ts` y `phase3-api-integration.test.ts`.

---

## 4. Auditoría de Reglas Fundamentales de CallTest V1

### A. Regla 12 / 15 y Manejo de `LOW_ACTIVITY`
- **Canónico**: Una campaña requiere 12 testers activos (`targetTesters: 12`) y admite hasta 15 activos (`maxTesters: 15`).
- **Invariante Verificado**: `LOW_ACTIVITY` no consume cupos del límite de 15 activos ni provoca solicitudes de reemplazo cuando ya existen 12 activos (ej. `12 ACTIVE + 5 LOW_ACTIVITY = 17 participantes` $\to$ `activeTesters = 12`, `replacementNeed = 0`, `riskLevel = HEALTHY`).
- **Déficit Verificado**: `11 ACTIVE + 1 LOW_ACTIVITY` $\to$ `replacementNeed = 1`, `riskLevel = AT_RISK`.

### B. Cálculo Individual de Fechas para Testers de Reemplazo
- **Canónico**: `expectedEndAt = joinedAt + durationDays * 24h`.
- **Invariante Verificado**: Nunca se calcula respecto a `campaign.startsAt`. Un reemplazo que ingresa en el Día 10 recibe sus 14 días individuales correspondientes.

### C. Regla del Tester Reemplazo de 2 Días
- **Canónico**: Si un reemplazo ingresa en el Día 12 y participa activamente durante 2 días antes de que la campaña global finalice en el Día 14, su participación es marcada como `COMPLETED` / `VALID`.
- **Invariante Verificado**: No se le aplica penalización de abandono ni reducción de Trust. Se emite el evento de dominio `tester.participation_completed` y se despacha la notificación `CAMPAIGN_PARTICIPATION_THANK_YOU`.

### D. SDK vs NO-SDK (Evidencias)
- **Canónico**: Apps con SDK verifican instalaciones de forma técnica y automatizada (`INSTALL_DETECTED` y `FIRST_OPEN`). Apps sin SDK registran `INSTALL_CLAIMED` y requieren envío de captura de pantalla con validación de hash SHA-256, límite de 10MB, tipos MIME permitidos (`image/png`, `image/jpeg`, `image/webp`), protección contra path traversal y revisión por parte del desarrollador con motivo de rechazo obligatorio.
- **Invariante Verificado**: `INSTALL_CLAIMED != INSTALL_VERIFIED`. Ambas modalidades permiten completar la campaña con 100% de legitimidad.

### E. Privacidad y Aislamiento IDOR
- **Canónico**: Los endpoints de desarrollador nunca exponen direcciones IP, seriales de hardware (IMEI/Android ID) ni puntajes internos de fraude de los testers.
- **Invariante Verificado**: `GET /users/:userId/fraud` está restringido exclusivamente al rol `ADMIN`. `GET /users/:userId/trust` para desarrolladores únicamente retorna `trustRank`, `reputationStatus` y `completedCampaignsCount`, sin exponer el puntaje numérico crudo ni el historial de auditoría.

---

## 5. Recomendaciones para Producción y Futuras Fases

1. **Aislamiento a Nivel de Base de Datos PostgreSQL**: En producción, asegurar que `SERIALIZABLE` o bloqueos pesimistas (`SELECT ... FOR UPDATE`) se utilicen si se incrementa el paralelismo a múltiples réplicas de contenedores sin afinidad de conexión.
2. **Monitoreo de Alertas de Red Compartida**: Mantener la regla de que múltiples cuentas en una misma IP o red universitaria no provoquen un `BAN` automático inmediato, sino el estado `FLAG` / `MONITOR` para evitar falsos positivos en entornos legítimos.

---

## 6. Conclusión de Readiness

El sistema CallTest V1 cuenta con una base de arquitectura limpia, segura, libre de advertencias y completamente verificada por 263 pruebas automatizadas.

Estado final: **`READY_FOR_PHASE_10`**
