# CAMPAIGN HEALTH ENGINE — CALLTEST V1

## 1. Visión General

El **Campaign Health Engine** (`CampaignHealthService`) es el subsistema responsable de evaluar en tiempo real el estado operativo, nivel de riesgo y necesidad controlada de reemplazos de testers en una campaña de prueba.

---

## 2. Regla Fundamental 12 / 15

En CallTest, toda campaña se rige por la invariante:

$$\text{TARGET\_ACTIVE\_TESTERS} = 12 \quad \le \quad \text{MAX\_ACTIVE\_TESTERS} = 15$$

### Semántica Operativa
1. **12 testers activos** es el objetivo deseado para satisfacer los requisitos de prueba cerrada de Google Play.
2. **15 testers activos** es el techo absoluto e infranqueable de participantes activos simultáneos.
3. El sistema **no** asigna 15 testers de forma indiscriminada. Los cupos 13, 14 y 15 únicamente se utilizan si una política futura de mitigación de riesgo lo autoriza explícitamente.
4. Si una campaña tiene 12 o más testers en estado `ACTIVE`, **la necesidad de reemplazo (`replacementNeed`) es exactamente 0**.

---

## 3. Separación Estricta de Estados de Tester

El motor distingue estrictamente entre:
* `ACTIVE`: Tester participando regularmente con actividad reciente y válida.
* `LOW_ACTIVITY`: Tester con baja frecuencia o actividad decreciente.
* `ABANDONED`: Tester que ha cesado totalmente su actividad durante su período.

### Reglas Clave sobre `LOW_ACTIVITY`
* Un tester en `LOW_ACTIVITY` **no** cuenta como `ACTIVE`.
* Un tester en `LOW_ACTIVITY` **no** consume el límite máximo de 15 testers `ACTIVE`.
* Un tester en `LOW_ACTIVITY` **no** dispara reemplazos automáticos si la campaña ya cuenta con 12 testers `ACTIVE`.
* Ejemplo válido: **15 ACTIVE + 2 LOW_ACTIVITY = 17 TOTAL**.

---

## 4. Cálculo de Necesidad de Reemplazo (`replacementNeed`)

El cálculo de reemplazos no es una simple resta ciega, sino un valor controlado y acotado por la capacidad máxima disponible:

```typescript
let replacementNeed = 0;
if (activeTesters < targetTesters) {
  replacementNeed = Math.min(
    targetTesters - activeTesters,
    Math.max(0, maxTesters - activeTesters),
  );
}
```

### Ejemplos de Comportamiento
| Active Testers | Low Activity | Abandoned | Replacement Need | Available Capacity |
| :---: | :---: | :---: | :---: | :---: |
| 12 | 0 | 0 | **0** | 3 |
| 11 | 0 | 1 | **1** | 4 |
| 10 | 0 | 2 | **2** | 5 |
| 12 | 5 | 0 | **0** | 3 |
| 14 | 1 | 0 | **0** | 1 |
| 15 | 2 | 0 | **0** | 0 |

---

## 5. Estados de Riesgo de la Campaña (`CampaignRisk`)

1. `HEALTHY`: $\ge 12$ activos, tasa de actividad $\ge 60\%$, 0 abandonos.
2. `WARNING`: 11 activos o $\ge 12$ activos con $\ge 3$ en `LOW_ACTIVITY`.
3. `AT_RISK`: 9–10 activos o $\ge 1$ abandonos confirmados.
4. `CRITICAL`: $< 9$ activos o $\ge 3$ abandonos.

---

## 6. Endpoints de Consulta

* `GET /campaigns/:campaignId/health`: Devuelve el desglose de testers, tasas de misión/actividad, necesidad de reemplazo y clasificación de riesgo.
