# CALLTEST V1 — PHASE 3 REPORT: MISSION ENGINE + ACTIVITY ENGINE

**Fecha:** 21 de Agosto de 2026  
**Estado:** COMPLETADO CON ÉXITO (PASS)  
**Proyecto:** `C:\Users\manue\calltest`

---

## 1. RESUMEN EJECUTIVO

La **Fase 3 (Mission Engine + Activity Engine)** ha sido implementada íntegramente de acuerdo con las especificaciones técnicas y requerimientos de dominio. Se han construido los motores de creación, validación de calidad, generación desacoplada, intentos con idempotencia estricta, telemetría de actividad anti-fraude, puntuación ponderada multi-señal y clasificación de testers sensible al período individual de reemplazo y resiliente a brechas temporales.

### Indicadores de Calidad
* **TypeScript Monorepo Build (`npm run build`):** PASS (0 errores en backend, api-contract y shared-types)
* **ESLint (`npm run lint`):** PASS (0 errores, 0 warnings)
* **Vitest Suite (`npm test`):** 132/132 PASS en 20 archivos de prueba
* **OpenAPI 3.0 Contract:** Actualizado con todos los endpoints de Misiones, Intentos, Feedback y Actividad
* **Prisma Engine:** Generado y sincronizado de forma no destructiva con modelos de Fase 3

---

## 2. MISSION ENGINE: COMPONENTES IMPLEMENTADOS

### 2.1 Modelo de Dominio y Calidad
* **Ciclo de Vida de Misión:** `DRAFT`, `PENDING_REVIEW`, `APPROVED`, `ACTIVE`, `PAUSED`, `COMPLETED`, `REJECTED`.
* **`MissionQualityService`:**
  * Valida longitud de título, objetivo y existencia de pasos estructurados.
  * Verifica límites configurables: `MISSION_MAX_STEPS` (15) y `MISSION_MAX_ESTIMATED_MINUTES` (60 min).
  * Detecta misiones con complejidad excesiva (`TOO_COMPLEX`) que combinan múltiples subsistemas desconectados (registro + compras + invitaciones + fotos).
* **Generación Desacoplada (`MissionGenerator`):**
  * Interfaz abstracta con implementación de plantilla `TemplateMissionGenerator`.
  * Los borradores generados inician invariablemente en estado `PENDING_REVIEW` y requieren aprobación humana.
  * Ningún generador de IA tiene autorización para otorgar recompensas, alterar balances ni auto-completar misiones.

### 2.2 Intentos de Misión (`MissionAttempt`) e Idempotencia Estricta
* **Inicio Idempotente:** `POST /missions/:missionId/start` retorna el intento activo (`STARTED`) si ya existe, sin duplicar registros.
* **Finalización Idempotente:** `POST /mission-attempts/:id/submit` previene dobles completados ante clics repetidos del usuario, garantizando exactamente una resolución y una sola emisión de eventos de dominio.
* **Protección IDOR:** Validación estricta que impide que un tester inicie o envíe intentos de misiones pertenecientes a otras campañas o a otros usuarios.

### 2.3 Métodos de Validación y Feedback
* **`MissionValidationService`:**
  * Auto-validación para métodos `SDK_EVENT`, `EVENT`, `CHECKLIST`, `SCREEN_FLOW`.
  * Validación manual (`MANUAL`, `HYBRID`) con registro del revisor, motivo y timestamp.
  * Emisión de eventos de dominio `MISSION_VALIDATED` y `MISSION_REJECTED` desacoplados para futuros motores de Recompensas y Trust.
* **Feedback del Tester:**
  * Dificultad percibida (`MissionDifficultyFeedback`): `EASY`, `MEDIUM`, `HARD` con unicidad `@@unique([missionId, campaignTesterId])` para evitar votos infinitos.
  * Calidad cualitativa (`MissionQualityFeedback`): `TOO_COMPLEX`, `CONFUSING`, `BROKEN`, `TOO_LONG`, `UNCLEAR`, `GOOD`.

---

## 3. ACTIVITY ENGINE: COMPONENTES IMPLEMENTADOS

### 3.1 Ingesta de Telemetría e Idempotencia de Eventos
* **`ActivityEvent`:** Registra eventos del SDK (`APP_OPENED`, `SESSION_STARTED`, `SCREEN_VIEW`, `MISSION_STARTED`, `FEEDBACK_SUBMITTED`, etc.).
* **Clave de Idempotencia:** Deduplicación estricta por `idempotencyKey` / `eventId`.
* **Validación de Reloj (`clientTimestamp` vs `serverTimestamp`):** Detección de timestamps futuros más allá de la tolerancia de deriva (`CLOCK_SKEW_TOLERANCE_MS`, 5 min), marcando los eventos anómalos como inválidos.

### 3.2 Seguimiento de Sesiones (`SessionRecord`)
* Agrupación por `sessionId`, cálculo automático de duración en segundos y detección de sesiones anómalas superiores a 24 horas consecutivas.

### 3.3 Activity Score Multi-Señal (`ActivityScoreService`)
Puntaje ponderado (0 a 100) calculado mediante señales ortogonales con pesos configurables:
* Sesiones y duraciones (`ACTIVITY_SESSION_WEIGHT = 0.25`).
* Misiones completadas de la campaña (`ACTIVITY_MISSION_WEIGHT = 0.35`).
* Feedback y bug reports reportados (`ACTIVITY_FEEDBACK_WEIGHT = 0.20`).
* Continuidad y días activos en el calendario (`ACTIVITY_CONTINUITY_WEIGHT = 0.20`).

### 3.4 Clasificación de Testers y Reglas Críticas de Dominio
* **Clasificación:** `ACTIVE`, `LOW_ACTIVITY`, `ABANDONED`.
* **Regla de Testers de Reemplazo (`isReplacement = true`):**
  * Evaluado estrictamente sobre su ventana individual de participación (`joinedAt` a la fecha).
  * Un tester que ingresa en el día 12 de 14 con alta actividad en sus 3 días es clasificado como `ACTIVE` sin penalización por no haber estado en los días 1-11.
* **Resiliencia ante Brechas:**
  * Un tester con pausa de 5 días (días 3-7) que retoma actividad frecuente del día 8 al 14 no es clasificado como `ABANDONED`, sino como `ACTIVE` gracias a la evaluación global de su comportamiento.

---

## 4. MAPA DE ENDPOINTS IMPLEMENTADOS EN FASE 3

| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/campaigns/:campaignId/missions` | `DEVELOPER`, `BOTH` | Creación de misión con evaluación de calidad. |
| `POST` | `/campaigns/:campaignId/missions/generate` | `DEVELOPER`, `BOTH` | Generación asistida de borradores (`PENDING_REVIEW`). |
| `GET` | `/campaigns/:campaignId/missions` | Autenticado | Listado de misiones de una campaña. |
| `GET` | `/missions/:id` | Autenticado | Detalle de una misión. |
| `PATCH` | `/missions/:id` | `DEVELOPER`, `BOTH` | Actualización de misión con re-evaluación de calidad. |
| `POST` | `/missions/:id/approve` | `DEVELOPER`, `BOTH`, `ADMIN` | Aprobación de misión a estado `ACTIVE`. |
| `POST` | `/missions/:id/reject` | `DEVELOPER`, `BOTH`, `ADMIN` | Rechazo de misión con motivo. |
| `POST` | `/missions/:missionId/start` | `TESTER`, `BOTH` | Inicio o reanudación idempotente de intento de misión. |
| `POST` | `/mission-attempts/:id/submit` | `TESTER`, `BOTH` | Envío idempotente y auto-validación de intento. |
| `GET` | `/campaign-testers/:testerId/missions` | Autenticado | Historial de intentos de un tester. |
| `POST` | `/mission-attempts/:id/difficulty` | `TESTER`, `BOTH` | Calificación única de dificultad por tester. |
| `POST` | `/mission-attempts/:id/quality-feedback` | `TESTER`, `BOTH` | Envío de retroalimentación cualitativa. |
| `POST` | `/activity/events` | `TESTER`, `BOTH`, SDK | Ingesta de eventos de actividad con rate limiting e idempotencia. |
| `GET` | `/campaign-testers/:campaignTesterId/activity-score` | Autenticado | Consulta de puntaje de actividad y señales. |
| `GET` | `/campaigns/:campaignId/testers/:testerId/overview` | `DEVELOPER`, `BOTH` | Vista del desarrollador sobre la participación y métricas del tester. |

---

## 5. RESUMEN DE PRUEBAS AUTOMATIZADAS (132 TESTS)

| Archivo de Prueba | Tests | Cobertura / Objetivo |
| :--- | :---: | :--- |
| `tests/mission-quality.test.ts` | 7 | Reglas de calidad: validación, pasos vacíos, límites de pasos, duración máxima, misiones `TOO_COMPLEX` con múltiples subsistemas, y advertencias. |
| `tests/mission-service.test.ts` | 6 | Creación en `DRAFT`, filtrado por calidad, generación en `PENDING_REVIEW`, aprobación, rechazo y protección IDOR. |
| `tests/mission-attempt-service.test.ts` | 6 | Inicio idempotente, restricción a inscritos, finalización idempotente ante clics duplicados, IDOR entre testers y validación manual. |
| `tests/mission-feedback-service.test.ts` | 4 | Registro de dificultad, rechazo de votos duplicados por el mismo tester, feedback cualitativo y control de acceso. |
| `tests/activity-engine.test.ts` | 6 | Deduplicación de eventos por `eventId`, detección de timestamps futuros anómalos, tracking de sesiones, cálculo de Activity Score, clasificación de reemplazos sin penalización, resiliencia ante brechas y detección de abandono real. |
| `tests/phase3-api-integration.test.ts` | 5 | Inyección HTTP completa en Fastify para Misiones, Intentos, Feedback y Telemetría. |
| *Pruebas de Fases Anteriores (Auth, Apps, Campaigns, RBAC, etc.)* | 98 | Compatibilidad continua y regresión 100% limpia. |
| **TOTAL** | **132** | **100% PASS** |

---

## 6. PRÓXIMOS PASOS (FASE 4)

Con el Mission Engine y el Activity Engine operativos y emitiendo señales estructuradas, la plataforma está lista para las siguientes integraciones:
1. **Campaign Health Engine:** Monitoreo global de la salud de campañas a partir de las clasificaciones de actividad agregadas.
2. **Matching Engine:** Asignación algorítmica de testers a campañas basadas en compatibilidad y disponibilidad.
3. **Trust & Rewards Engine:** Consumo de eventos `MISSION_VALIDATED` y señales de actividad para acreditación segura de recompensas (XP / Gold) y ajuste de reputación.

---
*Fin del informe de Fase 3. Detenido a la espera de autorización para la siguiente fase.*
