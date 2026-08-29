# ACTIVITY ENGINE — CALLTEST V1

## 1. Visión General y Principio de Telemetría

El **Activity Engine** procesa eventos de uso enviados desde el SDK móvil o el cliente web, valida la consistencia temporal, agrupa sesiones, calcula el puntaje ponderado de actividad (*Activity Score*) y clasifica a los testers en estados de participación.

---

## 2. Ingesta de Eventos (`ActivityEvent`) & Anti-Fraude

### 2.1 Tipos de Eventos Soportados (`ActivityEventType`)
* `APP_OPENED`, `APP_CLOSED`
* `SESSION_STARTED`, `SESSION_ENDED`
* `SCREEN_VIEW`, `USER_INTERACTION`
* `MISSION_STARTED`, `MISSION_SUBMITTED`, `MISSION_COMPLETED`
* `FEEDBACK_SUBMITTED`, `BUG_REPORTED`

### 2.2 Idempotencia de Eventos
Cada evento recibido desde el SDK incluye un `eventId` único asignado por el cliente, indexado en la base de datos como `idempotencyKey String @unique`.
Si la red móvil reintenta el envío, el backend identifica la clave existente y devuelve confirmación sin duplicar el conteo ni sesgar los cálculos de actividad.

### 2.3 Validación de Timestamps (`clientTimestamp` vs `serverTimestamp`)
* El backend nunca confía ciegamente en el reloj del dispositivo móvil.
* Almacena tanto el `clientTimestamp` como el `serverTimestamp`.
* **Detección de Deriva Temporal:** Si `clientTimestamp > serverTimestamp + CLOCK_SKEW_TOLERANCE_MS` (tolerancia por defecto: 5 minutos), el evento se almacena con `isValid = false` y se reporta como anomalía temporal / intento de manipulación horaria.

---

## 3. Seguimiento de Sesiones (`SessionRecord`)

El subsistema agrupa eventos por `sessionId` y calcula la duración real de uso:
* Registra `startedAt`, `endedAt`, `durationSeconds` y `source`.
* **Detección de Duraciones Imposibles:** Sesiones continuas superiores a 24 horas consecutivas son marcadas con el flag `isAnomalous = true` y no inflan artificialmente el puntaje de actividad.

---

## 4. Cálculo del Activity Score (`ActivityScoreService`)

El Activity Score es un valor compuesto continuo entre 0 y 100 calculado a partir de múltiples señales ortogonales:

$$\text{ActivityScore} = \left( w_{\text{session}} \cdot S_{\text{session}} + w_{\text{mission}} \cdot S_{\text{mission}} + w_{\text{feedback}} \cdot S_{\text{feedback}} + w_{\text{continuity}} \cdot S_{\text{continuity}} \right) \times 100$$

### Pesos Configurables (Variables de Entorno)
* `ACTIVITY_SESSION_WEIGHT` (Default: `0.25`): Frecuencia y duración de sesiones válidas.
* `ACTIVITY_MISSION_WEIGHT` (Default: `0.35`): Proporción de misiones de la campaña completadas y validadas.
* `ACTIVITY_FEEDBACK_WEIGHT` (Default: `0.20`): Retroalimentación de dificultad, calidad y reportes de error enviados.
* `ACTIVITY_CONTINUITY_WEIGHT` (Default: `0.20`): Distribución de días activos a lo largo del período individual de participación.

---

## 5. Clasificación de Participación (`ActivityClassificationService`)

Determina el estado operativo del tester en la campaña:
* `ACTIVE`: Tester con interacción frecuente, misiones completadas y actividad reciente.
* `LOW_ACTIVITY`: Tester con actividad esporádica o pausas moderadas.
* `ABANDONED`: Tester sin actividad registrada a lo largo de su ventana de participación.

### 5.1 Regla Obligatoria para Testers de Reemplazo (`isReplacement = true`)
* Un tester que ingresa como reemplazo (ej. día 12 de una campaña de 14 días) es evaluado **estrictamente sobre su propio período individual** (`campaignTester.joinedAt` a la fecha).
* Si el reemplazo participa activamente durante sus 3 días y completa misiones, es clasificado legítimamente como `ACTIVE`.
* **Cero penalizaciones:** No se le exige haber estado los 14 días iniciales de la campaña.

### 5.2 Resiliencia ante Pausas Temporales (Brechas de Actividad)
* Un tester que instala el día 1, realiza misiones el día 2, no tiene actividad los días 3-7, y retoma actividad frecuente del día 8 al 14 **NO es clasificado como `ABANDONED`**.
* El motor evalúa el comportamiento acumulado y la recencia de la última sesión para evitar falsos positivos de abandono.

---

## 6. Vista del Desarrollador (`Developer View`)

Endpoint `GET /campaigns/:campaignId/testers/:testerId/overview`:
Permite al desarrollador auditar el rendimiento por tester preservando la privacidad:
* Nombre visible y correo.
* Fecha de ingreso (`joinedAt`) y fecha esperada de finalización (`expectedEndAt`).
* Flag de reemplazo (`isReplacement`).
* Días de participación efectiva.
* Cantidad de misiones completadas.
* Activity Score y estado de clasificación (`ACTIVE`, `LOW_ACTIVITY`, `ABANDONED`).
