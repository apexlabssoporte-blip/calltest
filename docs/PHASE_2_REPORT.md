# CALLTEST V1 — PHASE 2 REPORT: DOMAIN FOUNDATION

**Fecha:** 21 de Agosto de 2026  
**Estado:** COMPLETADO CON ÉXITO (PASS)  
**Proyecto:** `C:\Users\manue\calltest`

---

## 1. RESUMEN EJECUTIVO

La **Fase 2 (Domain Foundation)** ha sido implementada íntegramente de acuerdo con los requisitos del dominio y las restricciones arquitectónicas. Se han establecido los modelos de dominio fundamentales, autenticación y autorización segura con control de acceso basado en roles (RBAC) y prevención de IDOR, administración del ciclo de vida de aplicaciones Android y campañas de prueba (con máquina de estados determinista), y gestión estructural de testers (invariante 12/15, reemplazos sin penalización y unicidad de membresía activa).

### Indicadores de Calidad
* **TypeScript Build (`npm run build`):** PASS (0 errores en monorepo)
* **ESLint (`npm run lint`):** PASS (0 errores, 0 warnings)
* **Vitest Suite (`npm test`):** 95/95 PASS en 14 archivos de prueba
* **OpenAPI Contract:** Actualizado y alineado exactamente con los endpoints REST implementados
* **Prisma Engine:** Generado y sincronizado de forma no destructiva

---

## 2. FUNCIONALIDADES IMPLEMENTADAS

### 2.1 Users & Identity
* **Roles Soportados:** `TESTER`, `DEVELOPER`, `BOTH`, `ADMIN`.
* **Capacidad Dual (`BOTH`):** Un mismo usuario puede actuar como desarrollador y como tester sin requerir cuentas separadas.
* **Estados de Usuario:** `ACTIVE`, `SUSPENDED`, `BANNED`, `DELETED`. Se bloquea estrictamente la autenticación para cualquier cuenta en estado no activo.
* **Metadatos:** Almacenamiento seguro de `lastLoginAt`, `displayName`, `trustScore` inicial (100), `rank` (`NOVATO`), y balances iniciales de XP y Gold.

### 2.2 Autenticación & Seguridad
* **Password Hashing:** Implementado con `Node.js crypto.scrypt` (clave de 64 bytes, salt aleatorio criptográfico de 16 bytes por usuario, y comparación en tiempo constante `crypto.timingSafeEqual`). Sin dependencias externas nativas.
* **JWT Access Tokens:** Expiración corta (~15 minutos) con claims mínimos (`sub`, `email`, `role`). Validación continua del estado del usuario en base de datos.
* **Refresh Tokens Rotativos:** Tokens opacos aleatorios de 48 bytes almacenados exclusivamente como hash SHA-256 en la base de datos (nunca en texto plano).
* **Detección de Reúso:** Si se detecta el intento de uso de un refresh token previamente revocado, se revoca inmediatamente toda la familia de tokens del usuario para mitigar robo de credenciales.
* **Logout Seguro:** Invalida el refresh token y registra el evento de auditoría.

### 2.3 Autorización (RBAC & IDOR Protection)
* **Middleware `requireRole`:**
  * `requireRole(DEVELOPER)` permite a usuarios con rol `DEVELOPER`, `BOTH` y `ADMIN`.
  * `requireRole(TESTER)` permite a usuarios con rol `TESTER`, `BOTH` y `ADMIN`.
  * `requireRole(ADMIN)` restringe el acceso exclusivamente a administradores.
* **Protección contra IDOR:**
  * `verifyAppOwnership`: Bloquea accesos no autorizados a aplicaciones que no pertenezcan al desarrollador autenticado.
  * `verifyCampaignOwnership`: Valida que la campaña y su aplicación matriz pertenezcan al desarrollador antes de cualquier consulta, modificación o transición.

### 2.4 Aplicaciones Android (Apps Domain)
* **Validación de Identidad Técnica:** Validación estricta de `package_name` bajo la convención Java/Android (`com.empresa.app`), exigiendo al menos dos segmentos y caracteres válidos.
* **Regla de Unicidad Activa:** Se impide que un desarrollador cree dos aplicaciones simultáneamente activas con el mismo `package_name`.
* **Soft Delete / Archiving:** El endpoint `DELETE /apps/:id` realiza un borrado lógico estableciendo el estado en `ARCHIVED`, preservando el historial de campañas, testers, métricas y auditoría sin `CASCADE DELETE` destructivos.

### 2.5 Campañas & State Machine
* **Configuración Centralizada:** Parámetros configurables con valores por defecto validados al inicio del backend (`CAMPAIGN_TARGET_TESTERS=12`, `CAMPAIGN_MAX_TESTERS=15`, `CAMPAIGN_DURATION_DAYS=14`), verificando que `TARGET > 0`, `MAX >= TARGET` y `DURATION > 0`.
* **`CampaignStateMachine`:** Máquina de estados determinista que valida las siguientes transiciones:
  * `DRAFT` $\to$ `READY`, `CANCELLED`
  * `READY` $\to$ `ACTIVE`, `DRAFT`, `CANCELLED`
  * `ACTIVE` $\to$ `TESTING`, `PAUSED`, `CANCELLED`, `SUSPENDED`
  * `PAUSED` $\to$ `ACTIVE`, `CANCELLED`
  * `TESTING` $\to$ `COMPLETED`, `PAUSED`, `SUSPENDED`
  * `COMPLETED` $\to$ `PUBLIC` (representación de dominio)
  * `SUSPENDED` $\to$ `ACTIVE` (Requiere rol `ADMIN`; los desarrolladores no pueden reactivar campañas suspendidas).
  * Estados terminales protegidos: `PUBLIC` y `CANCELLED`.
* **Cálculo de Fechas:** Al pasar a `ACTIVE`, se calculan y fijan `startsAt` y `endsAt` de la campaña.

### 2.6 Campaign Testers (Regla 12/15 & Reemplazos)
* **Invariante `active_testers <= 15`:** Verificación estricta de límite. Se permiten hasta 15 testers en estado `ACTIVE` y se rechaza la adición del 16º.
* **Separación de `LOW_ACTIVITY`:** Los testers con estado `LOW_ACTIVITY` permanecen en la campaña sin ser sumados indebidamente al cupo de activos principales.
* **Cálculo Individual de Participación:** Para cada tester y reemplazo, `expectedEndAt` se calcula como `joinedAt + 14 días`, garantizando que testers que ingresen en el día 8 tengan su ciclo completo sin depender de `campaign.startsAt`.
* **Reemplazos sin Penalización:** El flag `isReplacement = true` registra la modalidad de incorporación sin penalizar automáticamente Trust, XP ni Ranking.
* **Unicidad de Membresía Activa:** Un usuario no puede tener más de una participación activa concurrente (`INVITED`, `ACTIVE`, `LOW_ACTIVITY`) en la misma campaña.

### 2.7 Auditoría de Seguridad (AuditLog)
* Registro de eventos clave en la base de datos y emisión en el `DomainEventBus`:
  * `USER_REGISTERED`, `LOGIN`, `LOGOUT`, `APP_CREATED`, `APP_UPDATED`, `APP_ARCHIVED`, `CAMPAIGN_CREATED`, `CAMPAIGN_STATE_CHANGED`, `CAMPAIGN_TESTER_ADDED`, `CAMPAIGN_TESTER_REMOVED`, `REFRESH_TOKEN_REVOKED`.
* Sanitización y redacción automática de contraseñas, hashes y tokens en los payloads de auditoría.

---

## 3. MAPA DE ENDPOINTS IMPLEMENTADOS

### 3.1 Autenticación & Usuario
| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Público | Registro de usuario (`TESTER`, `DEVELOPER`, `BOTH`). |
| `POST` | `/auth/login` | Público | Autenticación con credenciales y emisión de tokens. |
| `POST` | `/auth/refresh` | Público | Rotación de refresh token y renovación de access token. |
| `POST` | `/auth/logout` | Autenticado | Revocación de sesión y refresh token. |
| `GET` | `/me` | Autenticado | Perfil del usuario actualmente autenticado. |

### 3.2 Aplicaciones (Apps)
| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/apps` | `DEVELOPER`, `BOTH` | Creación de aplicación Android con validación de paquete. |
| `GET` | `/apps` | `DEVELOPER`, `BOTH` | Listado de aplicaciones del desarrollador autenticado. |
| `GET` | `/apps/:id` | `DEVELOPER`, `BOTH` | Detalle de aplicación con verificación IDOR. |
| `PATCH` | `/apps/:id` | `DEVELOPER`, `BOTH` | Actualización de metadatos o estado de la app. |
| `DELETE` | `/apps/:id` | `DEVELOPER`, `BOTH` | Archivado lógico (soft delete) de la aplicación. |

### 3.3 Campañas (Campaigns)
| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/apps/:appId/campaigns` | `DEVELOPER`, `BOTH` | Creación de campaña en estado `DRAFT`. |
| `GET` | `/apps/:appId/campaigns` | `DEVELOPER`, `BOTH` | Listado de campañas de una app del desarrollador. |
| `GET` | `/campaigns/:id` | `DEVELOPER`, `BOTH` | Detalle de campaña y conteo de testers activos. |
| `PATCH` | `/campaigns/:id` | `DEVELOPER`, `BOTH` | Modificación de configuración (en `DRAFT` o `READY`). |
| `POST` | `/campaigns/:id/transition` | `DEVELOPER`, `BOTH`, `ADMIN` | Ejecución de transición de estado validada. |

### 3.4 Participación de Testers (Campaign Testers)
| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/campaigns/:campaignId/testers` | `DEVELOPER`, `BOTH` | Listado de testers asignados a la campaña. |
| `GET` | `/campaigns/:campaignId/testers/:testerId` | `DEVELOPER`, `BOTH`, o propio tester | Consulta de participación individual. |
| `POST` | `/campaigns/:campaignId/testers` | `DEVELOPER`, `BOTH` | Asignación administrativa de tester (invariante 12/15). |
| `DELETE` | `/campaigns/:campaignId/testers/:testerId` | `DEVELOPER`, `BOTH` | Remoción de tester con registro de `exitReason`. |

---

## 4. BASE DE DATOS Y ESQUEMA PRISMA

### Resumen de Cambios en `prisma/schema.prisma`
1. **Enums actualizados:**
   * `UserRole`: `TESTER`, `DEVELOPER`, `BOTH`, `ADMIN`.
   * `UserStatus`: `ACTIVE`, `SUSPENDED`, `BANNED`, `DELETED`.
   * `AppStatus`: `DRAFT`, `ACTIVE`, `PAUSED`, `PUBLIC`, `ARCHIVED`, `SUSPENDED`.
   * `CampaignStatus`: `DRAFT`, `READY`, `ACTIVE`, `TESTING`, `COMPLETED`, `PUBLIC`, `PAUSED`, `CANCELLED`, `SUSPENDED`.
   * `TesterStatus`: `INVITED`, `ACTIVE`, `LOW_ACTIVITY`, `ABANDONED`, `COMPLETED`, `REMOVED`.
   * `AuditAction`: Ampliado con acciones explícitas de registro, apps, campañas y sesiones.
2. **Entidades actualizadas:**
   * `User`: Adición de `displayName`, `status`, `lastLoginAt`.
   * `RefreshToken`: Nueva entidad para rotación y revocación segura.
   * `App`: Adición de `status`, `playStoreUrl`, `googleGroupUrl`, eliminación de cascada destructiva en favor de restricciones seguras (`onDelete: Restrict`).
   * `Campaign`: Estados de dominio exactos, `startsAt`, `endsAt`.
   * `CampaignTester`: Metadatos `isReplacement`, `exitReason`, `expectedEndAt`, `actualEndAt`.

---

## 5. RESUMEN DE PRUEBAS AUTOMATIZADAS (95 TESTS)

| Archivo de Prueba | Tests | Cobertura / Objetivo |
| :--- | :---: | :--- |
| `tests/security.test.ts` | 8 | Criptografía scrypt, salts únicos, timingSafeEqual, hashes SHA-256 de refresh tokens. |
| `tests/auth-service.test.ts` | 11 | Registro, login, bloqueo de suspendidos/baneados/eliminados, rotación y detección de reúso de refresh tokens. |
| `tests/rbac-permissions.test.ts` | 10 | Evaluación de permisos `DEVELOPER`, `TESTER`, `BOTH` y `ADMIN`. |
| `tests/apps-service.test.ts` | 8 | Creación de apps, validación de paquete, duplicados activos, protección IDOR, soft delete. |
| `tests/validators.test.ts` | 5 | Formato de package name Android y validación de variables de entorno al arranque. |
| `tests/campaign-state-machine.test.ts` | 15 | Todas las transiciones válidas e inválidas, y restricción de reactivación administrativa para `SUSPENDED`. |
| `tests/campaign-service.test.ts` | 7 | Creación con defaults 12/15/14, verificación IDOR, actualización y transiciones de campaña. |
| `tests/campaign-tester-service.test.ts` | 10 | Invariante 12/15 (tests de borde 10$\to$11, 11$\to$12, 12$\to$13, 13$\to$14, 14$\to$15 permitidos; 15$\to$16 rechazado), independencia de `LOW_ACTIVITY`, cálculo individual de fechas y reemplazos. |
| `tests/audit-service.test.ts` | 1 | Creación de bitácora y redacción automática de campos sensibles. |
| `tests/api-integration.test.ts` | 7 | Flujo HTTP completo en Fastify con inyección de peticiones (Auth, Apps, RBAC, Transiciones). |
| `tests/config.test.ts` | 2 | Carga y configuración de entorno. |
| `tests/errors.test.ts` | 5 | Clases de error de dominio Fastify / AppError. |
| `tests/event-bus.test.ts` | 3 | Bus de eventos desacoplado en memoria. |
| `src/modules/health/health.test.ts` | 3 | Probes de salud liveness y readiness. |
| **TOTAL** | **95** | **100% PASS** |

---

## 6. PRÓXIMOS PASOS (FASE 3)

Al concluir la Fase 2, la plataforma cuenta con una base sólida de dominio, autenticación, autorización e integridad estructural.

Los siguientes componentes quedan preparados para ser construidos en las fases posteriores:
1. **Matching Engine:** Asignación automática de testers a campañas basadas en compatibilidad y disponibilidad (habilitará `POST /campaigns/:id/join`).
2. **Activity Engine & Telemetría:** Procesamiento de eventos Android enviados por el SDK para transicionar automáticamente testers entre `ACTIVE`, `LOW_ACTIVITY` y `ABANDONED`.
3. **Trust & Rewards Engine:** Cálculo dinámico de reputación y otorgamiento de recompensas tras misiones verificadas.
4. **Public Availability Verification:** Validación externa en Google Play Store previo a completar el ciclo público de la campaña.

---
*Fin del informe de Fase 2. Esperando autorización para fases posteriores.*
