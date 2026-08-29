# CallTest V1 — Play Store Validation & Publication Verification

## 1. Principles & Threat Modeling

1. **Backend as Sole Authority**:
   - CallTest never assumes a Google Play link is valid or public solely because the developer entered a URL.
   - Developer claims are tracked under `App.status`, while independent automated validations are stored under `campaign.storeValidationStatus` and `campaign.publicVerifiedAt`.
2. **SSRF Guard & Network Defense**:
   - Backend calls to validate URLs pass through `SsrfGuard`.
   - Rejects loopback addresses (`127.0.0.0/8`, `localhost`), link-local/cloud metadata (`169.254.169.254`, `metadata.google.internal`), and private RFC 1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
   - Restricts hostnames strictly to `play.google.com`.

---

## 2. Validation Statuses

| Status | Meaning |
|---|---|
| `UNKNOWN` | URL has not yet been audited or could not be determined. |
| `NOT_FOUND` | Google Play returned 404 or package is not indexed. |
| `PRIVATE` | Listing is restricted or requires non-public access credentials. |
| `TESTING` | Listing is an active closed testing track (`/apps/testing/{packageName}`). |
| `PUBLIC` | Listing is active and publicly available in the Google Play store. |
| `UNAVAILABLE` | Region locked or temporarily unindexed. |
| `ERROR` | Invalid URL format, package mismatch, or network error. |

---

## 3. Package Name Consistency

The validator parses the `id` query parameter from `https://play.google.com/store/apps/details?id={packageName}` and verifies that it strictly matches `app.packageName`. If there is a mismatch, the validator returns `status: ERROR` with `errorCode: PACKAGE_MISMATCH`.
