# CallTest V1 — Google Group Validation & Manual Link Verification

## 1. Google Group Verification Architecture

Google Groups are required for closed beta distribution on Google Play. Because Google restricts programmatic member enumeration behind authentication, CallTest employs a dual-layer verification model:

1. **Automated URL & Routing Audit**:
   - `GoogleGroupValidationService` verifies syntax, host (`groups.google.com`), format (`https://groups.google.com/g/{group-name}`), and public reachability.
   - `SsrfGuard` validates the request does not target internal subnets or cloud metadata.
2. **Mandatory Real-Device Link Confirmation**:
   - The developer must explicitly test the join link on a real mobile device and invoke `POST /campaigns/:id/confirm-links-test`.
   - Campaign Readiness strictly blocks transitioning to `READY` until `developerConfirmedLinksTest = true`.

---

## 2. Validation Statuses

| Status | Meaning |
|---|---|
| `UNKNOWN` | Link reachability cannot be confirmed with certainty. |
| `ACCESSIBLE` | Group exists and routing is accessible. |
| `REQUIRES_APPROVAL` | Group configuration requires manual manager approval before joining. |
| `INACCESSIBLE` | Group returned HTTP error or is inaccessible. |
| `INVALID_URL` | Malformed URL, missing group path, or forbidden domain. |

---

## 3. Developer Pre-Flight UI Message

> *"Antes de activar tu campaña, prueba los enlaces desde un teléfono real para confirmar que los testers pueden abrir el grupo y acceder correctamente a la aplicación."*
