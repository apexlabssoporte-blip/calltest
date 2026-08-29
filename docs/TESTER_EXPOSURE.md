# TESTER EXPOSURE & LOAD MANAGEMENT — CALLTEST V1

## 1. Visión General

El **Tester Exposure Engine** (`TesterExposureService` y `TesterLoadService`) gestiona la capacidad máxima de campañas simultáneas que un tester puede asumir, previniendo la saturación, el fraude por acumulación excesiva y asegurando una progresión gradual basada en comportamiento sostenido.

---

## 2. Niveles de Exposición y Capacidad (`TesterExposureLevel`)

| Nivel | Capacidad Máxima de Campañas Simultáneas | Criterio de Promoción por Comportamiento Sostenido |
| :--- | :---: | :--- |
| `NEW` | **1** | Nivel inicial para todo tester recién registrado. |
| `PROBATION` | **2** | $\ge 1$ campaña completada, promedio de actividad $\ge 60$, tasa de abandono $< 30\%$. |
| `ESTABLISHED` | **3** | $\ge 3$ campañas completadas, promedio de actividad $\ge 75$, tasa de abandono $< 20\%$. |
| `HIGH_PERFORMER` | **4** | $\ge 6$ campañas completadas, promedio de actividad $\ge 85$, tasa de abandono $< 10\%$. |

---

## 3. Principios Fundamentales de Exposición

1. **Exposición NO es Asignación:**
   * Que un tester tenga capacidad de 3 campañas (`ESTABLISHED`) significa que puede participar en *hasta* 3 campañas a la vez si hay disponibilidad y compatibilidad; **no** significa que el sistema deba asignarle 3 campañas de forma forzada.
2. **Progresión por Comportamiento Sostenido:**
   * La promoción requiere evidencia histórica acumulada de misiones completadas y puntuación constante.
3. **Degradación por Mal Comportamiento (Demotion):**
   * Si un tester incurre en abandonos reiterados ($\ge 2$ abandonos o tasa de abandono $\ge 40\%$), su nivel de exposición se reduce progresivamente hasta `NEW` para mitigar riesgos, sin eliminar su cuenta.
4. **Autoridad Exclusiva del Backend:**
   * El cliente o SDK nunca puede declarar o enviar su nivel de exposición ni su capacidad. El backend calcula y aplica estos valores de manera soberana.

---

## 4. Control de Carga (`TesterLoadService`)

Calcula en tiempo real las campañas activas del usuario (`INVITED`, `ACTIVE`, `LOW_ACTIVITY` en campañas activas).
* Si `activeCampaigns >= maxActiveCampaigns`, cualquier intento de asignación adicional es rechazado inmediatamente con motivo `"CAPACITY_EXCEEDED"`.
* Esto protege al ecosistema contra casos patológicos donde un tester pudiera terminar con decenas de campañas activas simultáneas.

---

## 5. Endpoints de Exposición

* `GET /me/exposure`: Permite al tester autenticado consultar su nivel de exposición actual, su capacidad máxima autorizada y su cantidad de campañas activas.
