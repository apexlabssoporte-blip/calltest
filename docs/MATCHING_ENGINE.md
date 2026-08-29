# MATCHING ENGINE — CALLTEST V1

## 1. Visión General y Flujo de Decisión

El **Matching Engine** es el subsistema encargado de emparejar de manera justa, algorítmica y transaccional a los testers candidatos con las campañas que requieren participantes o reemplazos.

### Flujo de Asignación Controlada
```text
CampaignHealthService
       ↓
¿Se necesita reemplazo? (replacementNeed > 0)
       ↓
MatchingStrategy (DefaultMatchingStrategy)
       ↓
CampaignCompatibilityService (Elegibilidad, Auto-Prueba, Capacidad)
       ↓
TesterExposureService & TesterLoadService
       ↓
Ranking de Candidatos (Puntuación 0-100)
       ↓
Transacción Atómica en Base de Datos ($transaction)
       ↓
Asignación Idempotente y Fechas Individuales
```

---

## 2. Puntuación Compuesta Interna (Matching Score)

El matching evalúa a cada tester disponible mediante un puntaje compuesto de 0 a 100 con pesos centralizados y configurables:

$$\text{MatchingScore} = w_{\text{act}} \cdot \text{Score}_{\text{actividad}} + w_{\text{comp}} \cdot \text{Tasa}_{\text{completado}} + w_{\text{load}} \cdot \text{Carga}_{\text{inversa}} + w_{\text{exp}} \cdot \text{Nivel}_{\text{exposición}}$$

### Factores y Pesos Configurables
* `MATCHING_WEIGHT_ACTIVITY` (`0.35`): Desempeño y constancia histórica.
* `MATCHING_WEIGHT_COMPLETION` (`0.30`): Proporción de campañas culminadas exitosamente sin abandono.
* `MATCHING_WEIGHT_INVERSE_LOAD` (`0.20`): Prioriza a testers con menor carga activa actual.
* `MATCHING_WEIGHT_EXPOSURE` (`0.15`): Reconocimiento del nivel de exposición alcanzado (`NEW`: 60, `PROBATION`: 75, `ESTABLISHED`: 90, `HIGH_PERFORMER`: 100).

---

## 3. Reglas Críticas de Seguridad y Dominio

### 3.1 Prohibición de Auto-Prueba (Self-Testing Rejection)
* **Un desarrollador no puede ser tester de su propia aplicación.**
* Si `app.developerId === testerId`, el motor rechaza la compatibilidad con el motivo `"SELF_TESTING_NOT_ALLOWED"`.
* Los usuarios con rol `BOTH` pueden desarrollar sus propias apps y probar aplicaciones de otros desarrolladores, pero nunca sus propias campañas.

### 3.2 Control de Concurrencia y Techo de 15
* Toda asignación se ejecuta dentro de un bloque transaccional `prisma.$transaction`.
* Se re-verifica el conteo de testers en estado `ACTIVE` antes de insertar. Si la campaña alcanza 15 activos, la asignación se detiene inmediatamente para evitar sobreasignaciones concurrentes.

### 3.3 Idempotencia Estricta
* Si una solicitud intenta asignar a un tester que ya cuenta con participación activa en la campaña (`INVITED`, `ACTIVE`, `LOW_ACTIVITY`), la operación descarta el duplicado y mantiene exactamente un registro.

### 3.4 Fechas Individuales del Tester de Reemplazo
* Todo tester incorporado como reemplazo recibe:
  * `isReplacement = true`
  * `joinedAt = fecha real de incorporación`
  * `expectedEndAt = joinedAt + durationDays * 86400000 ms`
* El historial del tester anterior que abandonó la campaña se conserva intacto en estado `ABANDONED` para fines de auditoría y análisis de reputación.

---

## 4. Endpoints

* `POST /internal/matching/campaigns/:campaignId/evaluate`: Ejecuta la evaluación de salud y asignación transaccional de candidatos compatibles para la campaña solicitada.
