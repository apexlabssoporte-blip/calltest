# TRUST ENGINE — CALLTEST V1

## 1. Visión General y Principios de Dominio

El **Trust Engine** (`TrustScoreService`, `TrustProfileService`, `TrustPenaltyService`, `TrustRecoveryService`) es el subsistema central encargado de computar, persistir y rehabilitar de manera auditable e inmutable la confiabilidad histórica de los testers.

### Principio Fundamental: Confiabilidad vs Actividad
* La **Actividad** (`Activity Score`) mide el volumen y la regularidad del uso técnico reciente de la app.
* El **Trust** (`Trust Score`) mide la integridad, seriedad y comportamiento histórico del tester.
* Un tester puede tener **Activity Score alto** pero **Trust bajo** si incurre en comportamientos sospechosos o abandonos sistemáticos.
* El Trust **no** es una simple cuenta de misiones completadas; representa un historial ponderado y protegido.

---

## 2. Condición de Incertidumbre Inicial (New User)

Todo nuevo usuario inicia bajo una condición de incertidumbre controlada:
* `trustScore = 50` (Puntaje neutral de arranque configurado en `TRUST_INITIAL_SCORE`).
* `trustRank = NEW`.
* `reputationStatus = NORMAL`.

A partir de este punto base, el score evoluciona según la evidencia acumulada.

---

## 3. Rangos de Trust (`TrustRank`)

| Rango | Requisitos Mínimos de Score y Evidencia |
| :--- | :--- |
| `RESTRICTED` | $\text{Score} \le 30$ o reputación en `RESTRICTED`/`SUSPENDED`/`BANNED`. |
| `NEW` | $\text{Score} < 60$ o $< 1$ campaña completada. |
| `TRUSTED` | $\text{Score} \ge 60$ y $\ge 1$ campaña completada con éxito. |
| `RELIABLE` | $\text{Score} \ge 75$ y $\ge 3$ campañas completadas con éxito. |
| `EXCELLENT` | $\text{Score} \ge 90$, $\ge 6$ campañas completadas y 0 eventos de fraude activos. |

---

## 4. Fórmula Multi-Señal del Trust Score

El cálculo del puntaje se evalúa de manera transaccional y se acota estrictamente entre 0 y 100:

$$\text{RawScore} = 50 + \text{Bonos}_{\text{misiones}} + \text{Bonos}_{\text{campañas}} + \text{Bonos}_{\text{feedback}} - \text{Deducciones}_{\text{abandono}} - \text{Penalizaciones} - \text{Deducción}_{\text{fraude}}$$

### Componentes y Límites
* **Misiones Validadas:** $+1$ punto por intento validado (Tope máximo: $+20$).
* **Campañas Completadas:** $+5$ puntos por campaña terminada exitosamente (Tope máximo: $+25$).
* **Feedback Útil:** $+2$ puntos por reporte útil con valoración $\ge 1$ (Tope máximo: $+10$).
* **Abandono de Campaña:** $-15$ puntos por cada campaña en estado `ABANDONED`.
* **Penalizaciones Aplicadas:** Suma directa del impacto de penalizaciones activas.
* **Impacto de Fraude:** $-0.5 \times \text{FraudScore}$.
* **Invariante de Límites:**

$$0 \le \text{trustScore} \le 100$$

---

## 5. Historial Inmutable (`TrustHistory`)

Cada transición de score o rango genera un registro inmutable en `trust_histories`:
* Registra `previousScore`, `newScore`, `previousRank`, `newRank`, `eventType`, `reason`, `sourceId` y `metadata`.
* **Nunca se editan ni se eliminan registros históricos de Trust.**

---

## 6. Sistema de Penalizaciones (`TrustPenaltyService`)

* **Idempotencia:** La aplicación de penalizaciones exige `idempotencyKey` única. Eventos duplicados no generan dobles deducciones.
* **Tipos de Penalización (`TrustPenaltyType`):**
  * `CAMPAIGN_ABANDONMENT`
  * `FRAUD_SIGNAL`
  * `REPEATED_SUSPICIOUS_ACTIVITY`
  * `INVALID_MISSION_BEHAVIOR`
  * `ACCOUNT_ABUSE`

---

## 7. Rehabilitación Gradual (`TrustRecoveryService`)

El Trust permite la recuperación de reputación mediante conducta consistente demostrada:
* **Condiciones de Recuperación:**
  * 0 eventos de fraude no resueltos.
  * $\ge 2$ campañas consecutivas completadas con $\text{activityScore} \ge 70$.
  * $\ge 5$ misiones validadas.
* **Bono Gradual:** $+10$ puntos de recuperación aplicados de forma progresiva (nunca instantánea).
* Registro auditable con `AuditAction.TRUST_RECOVERY`.

---

## 8. Endpoints de Consulta

* `GET /me/trust`: Retorna el perfil completo de confianza, desglose y últimos 20 eventos del historial inmutable.
* `GET /users/:userId/trust`: Vista sanitizada para desarrolladores de campañas (protección de privacidad del tester).
