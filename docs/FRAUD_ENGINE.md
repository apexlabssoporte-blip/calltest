# FRAUD ENGINE & SECURITY DECISIONS — CALLTEST V1

## 1. Visión General y Principio de Detección Desacoplada

El **Fraud Engine** (`FraudScoreService`, `FraudDecisionService`, detectores desacoplados `FraudSignal`) analiza telemetría y patrones de uso para mitigar abusos, granjas de cuentas y automatización no autorizada.

### Principio Fundamental: Señales vs Decisiones Definitivas
* Una sola señal aislada **no** constituye fraude definitivo.
* Las señales acumulan evidencia cuantificable dentro de un modelo de riesgo proporcional.
* Se implementa **Protección Obligatoria contra Falsos Positivos** (False Positive Protection).

---

## 2. Detectores de Señales de Fraude (`FraudSignal`)

| Señal (`FraudEventType`) | Severidad | Impacto | Patrón Evaluado |
| :--- | :---: | :---: | :--- |
| `DUPLICATE_EVENT` | `LOW` | $+5$ | Reenvío o telemetría idéntica en ráfagas sub-segundo. |
| `CLOCK_MANIPULATION` | `MEDIUM` | $+15$ | Desviación temporal del cliente $> 5$ minutos a futuro o $> 7$ días al pasado. |
| `IMPOSSIBLE_SESSION` | `HIGH` | $+25$ | Sesión continua $> 24$ horas o duración físicamente inválida. |
| `RAPID_MISSION_COMPLETION` | `HIGH` | $+25$ | Misión enviada en $< 5$ segundos o $< 5\%$ del tiempo mínimo estimado. |
| `ABNORMAL_MISSION_PATTERN` | `HIGH` | $+30$ | Ráfagas masivas de $\ge 5$ misiones enviadas en $< 1$ minuto. |
| `REPEATED_ASSIGNMENT_ABUSE` | `HIGH` | $+30$ | Patrón sistemático de $\ge 3$ abandonos en períodos cortos. |
| `MULTIPLE_ACCOUNT_SIGNAL` | `MEDIUM` | $+20$ | Múltiples cuentas ($\ge 3$) vinculadas a la misma huella de hardware. |
| `SUSPICIOUS_ACTIVITY_BURST` | `MEDIUM` | $+20$ | Ráfagas sintéticas de $> 50$ eventos en $< 2$ segundos. |

---

## 3. Protección contra Falsos Positivos

El sistema **nunca** marca fraude por las siguientes razones legítimas:
1. **Volumen Alto de Misiones:** Un usuario productivo que completa muchas misiones con tiempos y eventos humanos válidos no es penalizado.
2. **Uso Frecuente de la App:** Abrir la app repetidas veces no infla el score de fraude.
3. **Múltiples Campañas Permitidas:** Un tester de rango alto participando en hasta 4 campañas simultáneas no es sospechoso.
4. **Condición de Replacement:** Asumir una vacante como tester de reemplazo (`isReplacement = true`) no genera sospecha.
5. **Redes Compartidas (Hogares/Oficinas):** El uso de la misma IP no genera bloqueos automáticos; se evalúan múltiples señales coincidentes antes de escalar.

---

## 4. Puntuación Normalizada (`FraudScoreService`)

El Fraud Score se normaliza de forma acotada:

$$0 \le \text{fraudScore} \le 100$$

* `0`: Sin señales relevantes (comportamiento normal).
* `25 - 49`: Actividad inusual / monitoreo preventivo.
* `50 - 74`: Actividad sospechosa / restricción preventiva de capacidad.
* `75 - 89`: Fraude probable / suspensión temporal.
* `90 - 100`: Fraude crítico / baneo permanente.

---

## 5. Motor de Decisiones de Seguridad (`FraudDecisionService`)

El motor mapea el puntaje acumulado a acciones proporcionales:
* `NO_ACTION`: Operación estándar sin intervención.
* `MONITOR` / `FLAG`: Monitoreo en segundo plano.
* `RESTRICT`: Capacidad reducida a 1 campaña y revisión.
* `SUSPEND`: Suspensión de cuenta y bloqueo de nuevas asignaciones.
* `BAN`: Bloqueo permanente de acceso.

### Registro en AuditLog
Toda decisión crítica queda registrada con `AuditAction.FRAUD_DECISION_MADE`, `USER_RESTRICTED`, `USER_SUSPENDED` o `USER_BANNED`.

---

## 6. Privacidad y RBAC Estricto

* **Acceso de Desarrollador:** Los desarrolladores **nunca** reciben reportes internos de fraude, IPs, huellas de hardware ni algoritmos de seguridad de los testers.
* **Acceso de Administrador:** Únicamente los usuarios con rol `ADMIN` pueden consultar el endpoint confidencial:
  * `GET /users/:userId/fraud` (Protegido por `requireRole(UserRole.ADMIN)`).
