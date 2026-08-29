# REPUTATION & RESTRICTIONS SYSTEM — CALLTEST V1

## 1. Visión General

El **Reputation System** (`ReputationService`) actúa como el puente regulatorio entre el **Fraud Engine**, el **Trust Engine** y el **Matching Engine**. Gestiona el estado de reputación y las restricciones activas que limitan la participación de los testers.

---

## 2. Estados de Reputación (`ReputationStatus`)

| Estado | Significado Operativo | Impacto en Matching y Capacidad |
| :--- | :--- | :--- |
| `NORMAL` | Tester en pleno cumplimiento y sin banderas activas. | Capacidad completa según su nivel de exposición (1 a 4 campañas). |
| `WATCH` | Actividad menor inusual bajo observación. | Matching monitoreado; sin reducción de capacidad inmediata. |
| `RESTRICTED` | Señales sospechosas acumuladas o score de trust crítico. | Capacidad máxima limitada a **1 campaña** y revisión manual. |
| `SUSPENDED` | Fraude probable o suspensión administrativa. | **Exclusión total de campañas** (`USER_SUSPENDED_OR_BANNED`). |
| `BANNED` | Abuso crítico o baneo permanente. | **Cuenta bloqueada permanentemente**. |

---

## 3. Integración con el Matching Engine

El Matching Engine incorpora el estado de reputación en dos niveles:

### 3.1 Filtro de Compatibilidad (`CampaignCompatibilityService`)
```typescript
if (
  trustProfile.reputationStatus === ReputationStatus.SUSPENDED ||
  trustProfile.reputationStatus === ReputationStatus.BANNED
) {
  return { isCompatible: false, reason: "USER_SUSPENDED_OR_BANNED" };
}

if (trustProfile.reputationStatus === ReputationStatus.RESTRICTED) {
  maxAllowedCampaigns = Math.min(1, maxAllowedCampaigns);
}
```

### 3.2 Ponderación en el Ranking (`DefaultMatchingStrategy`)
El puntaje compuesto del tester para asignaciones incorpora el **Trust Score** de manera balanceada:

$$\text{CompositeScore} = w_{\text{act}} \cdot \text{Actividad} + w_{\text{comp}} \cdot \text{Completitud} + w_{\text{load}} \cdot \text{CargaInversa} + w_{\text{exp}} \cdot \text{Exposición} + w_{\text{trust}} \cdot \text{TrustScore}$$

* `MATCHING_WEIGHT_ACTIVITY` = `0.30`
* `MATCHING_WEIGHT_COMPLETION` = `0.25`
* `MATCHING_WEIGHT_INVERSE_LOAD` = `0.15`
* `MATCHING_WEIGHT_EXPOSURE` = `0.15`
* `MATCHING_WEIGHT_TRUST` = `0.15`

---

## 4. Endpoints de Reputación

* `GET /me/reputation`: Consulta propia del tester autenticado con su estado de reputación y lista de restricciones activas (`["MONITORED_MATCHING"]`, `["REDUCED_CAPACITY"]`, etc.).
