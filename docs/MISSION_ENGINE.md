# MISSION ENGINE — CALLTEST V1

## 1. Visión General y Principio de Autoridad

El **Mission Engine** es el subsistema encargado de la creación, análisis de calidad, generación asistida, asignación, ejecución, validación y retroalimentación de las misiones de prueba en CallTest.

### Principio Fundamental
**El backend es la autoridad única e inviolable.**
* El cliente (Android SDK / Tester) emite eventos e intenciones de finalización.
* El backend valida la consistencia de las secuencias, permisos y reglas de dominio.
* Los generadores de IA únicamente *proponen* borradores (`PENDING_REVIEW`). Ninguna IA puede otorgar recompensas, alterar Trust ni completar misiones automáticamente.

---

## 2. Modelo de Dominio de Misiones

Cada misión pertenece estrictamente a una campaña:

```text
Campaign
   │
   └── Missions
         ├── Mission 1 (Onboarding)
         ├── Mission 2 (Catálogo / Búsqueda)
         └── Mission 3 (Checkout / Pago)
```

### 2.1 Campos de la Misión
* `id` (UUID): Identificador único.
* `campaignId` (UUID): Campaña matriz.
* `title` (String): Título conciso (5 a 150 caracteres).
* `description` (String?): Descripción detallada del flujo.
* `objective` (String): Propósito claro y medible (10 a 1000 caracteres).
* `steps` (Json / Array): Pasos estructurados (entre 1 y `MISSION_MAX_STEPS`).
* `difficulty` (`EASY`, `MEDIUM`, `HARD`): Nivel estimado de esfuerzo.
* `estimatedMinutes` (Int): Duración esperada (1 a `MISSION_MAX_ESTIMATED_MINUTES`).
* `validationMethod`: Método de verificación técnica o humana.
* `status`: Estado del ciclo de vida de la misión.
* `createdAt` / `updatedAt`: Timestamps de auditoría.

### 2.2 Estados de una Misión (`MissionStatus`)
1. `DRAFT`: Creada por el desarrollador en borrador.
2. `PENDING_REVIEW`: Generada automáticamente por el `MissionGenerator` pendiente de revisión humana.
3. `APPROVED` / `ACTIVE`: Aprobada para ser visualizada y ejecutada por los testers asignados.
4. `PAUSED`: Temporalmente oculta para nuevas ejecuciones.
5. `COMPLETED`: Misión cerrada al finalizar la campaña.
6. `REJECTED`: Propuesta descartada por el desarrollador o evaluador.

---

## 3. Servicio de Calidad (`MissionQualityService`)

Antes de persistir cualquier misión, el motor evalúa su viabilidad técnica y pedagógica:

### Reglas de Evaluación
1. **Límites de Pasos y Duración:**
   * Máximo número de pasos permitido: `MISSION_MAX_STEPS` (default: 15).
   * Duración máxima permitida: `MISSION_MAX_ESTIMATED_MINUTES` (default: 60 min).
2. **Detección de Complejidad Excesiva (`TOO_COMPLEX`):**
   * Analiza la presencia de múltiples verbos de acción y subsistemas dispares combinados en una sola misión (ej: registro + configuración + checkout + invitación de amigos + subida de fotos).
   * Si excede la densidad permitida, se rechaza con estado `REJECTED` y motivo `TOO_COMPLEX`.
3. **Misiones Demasiado Vagas (`TOO_VAGUE`):**
   * Rechaza títulos u objetivos con longitud insuficiente o carentes de instrucciones claras.

---

## 4. Generación Asistida (`MissionGenerator`)

La interfaz `MissionGenerator` desacopla el backend de proveedores específicos de IA:

```typescript
export interface MissionGenerator {
  generateMissions(input: GenerateMissionsInput): Promise<MissionDraft[]>;
}
```

* Las misiones propuestas inician obligatoriamente en `PENDING_REVIEW`.
* Deben ser explícitamente aprobadas (`POST /missions/:id/approve`) por el desarrollador antes de activarse.

---

## 5. Intentos de Misión (`MissionAttempt`) e Idempotencia

Un intento representa la ejecución de una misión por un tester:

```text
CampaignTester
      │
      └── MissionAttempt
             │
             └── Mission
```

### Estados del Intento (`AttemptStatus`)
* `AVAILABLE`: Misión visible no iniciada.
* `STARTED`: Intento en curso.
* `SUBMITTED`: Intento completado por el tester y enviado para verificación.
* `VALIDATED`: Verificación exitosa (emite evento de dominio `MISSION_VALIDATED`).
* `REJECTED`: Envío inválido o rechazado por el revisor.
* `EXPIRED`: Misión no completada dentro de la ventana de tiempo.

### Protección de Idempotencia Estricta
* **Inicio Idempotente (`startAttempt`):** Si un tester solicita iniciar una misión que ya se encuentra en estado `STARTED`, el backend retorna el intento activo existente sin duplicar registros.
* **Finalización Idempotente (`submitAttempt`):** Si el tester presiona múltiples veces "Completar", el backend responde con el estado ya procesado (`SUBMITTED` o `VALIDATED`) sin duplicar emisiones de eventos ni futuras recompensas.

---

## 6. Métodos de Validación (`MissionValidationService`)

Soporta métodos automáticos y manuales:
* `SDK_EVENT` / `EVENT` / `SCREEN_FLOW`: Validación inmediata basada en telemetría y eventos reportados.
* `MANUAL` / `HYBRID`: Queda en estado `SUBMITTED` para revisión del desarrollador (`POST /missions/:id/validate`), registrando auditoría y emitiendo `MISSION_VALIDATED` o `MISSION_REJECTED`.

---

## 7. Retroalimentación del Tester (Feedback)

Al culminar una misión, el tester puede registrar:
1. **Dificultad Percibida (`MissionDifficultyFeedback`):** `EASY`, `MEDIUM`, `HARD`. Cada tester tiene restringido un único voto por misión mediante restricción `@@unique([missionId, campaignTesterId])`.
2. **Calidad de Instrucciones (`MissionQualityFeedback`):** `TOO_COMPLEX`, `CONFUSING`, `BROKEN`, `TOO_LONG`, `UNCLEAR`, `GOOD`. Señal cualitativa consumida por el backend para auditoría de calidad.
