# Secure configuration

CallTest keeps demo data in the Android application for product testing, but production credentials and runtime data must stay outside Git.

## Backend production variables

Configure these values in the deployment platform before starting the API:

- `DATABASE_URL`: PostgreSQL connection string.
- `REDIS_URL`: TLS-enabled Redis connection string when available.
- `JWT_SECRET`: random value with at least 32 characters.
- `INTERNAL_SERVICE_KEY`: random identifier used only by trusted internal callers.
- `INTERNAL_SERVICE_SECRET`: random signing secret used only by trusted internal callers.
- `CORS_ORIGIN`: comma-separated HTTPS origins allowed to call the API. Wildcards are rejected in production.
- `EVIDENCE_STORAGE_PROVIDER=s3`: selects private S3-compatible evidence storage.
- `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`: private object-storage configuration.

The API now fails fast when an unsafe production configuration is detected.

## Android release signing

The release build no longer contains fallback signing passwords. Configure:

- `ANDROID_KEYSTORE_PATH`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `CALLTEST_API_BASE_URL`

Debug builds expose an explicitly labelled demonstration login and may show simulated profiles or campaigns. Release builds set `CALLTEST_DEMO_MODE=false`, do not create fallback sessions, and hide developer tools.

Keep the keystore in a protected backup location. The old tracked keystore must be rotated before a public launch because removing it from the current Git tree does not remove it from repository history.

## Runtime evidence

`apps/backend/uploads` is for local development only and is ignored by Git. Production uses the S3-compatible provider with private objects, server-side encryption and authenticated access through the backend.

## Database migration baseline

The baseline under `apps/backend/prisma/migrations` represents the current schema. For an existing database, inspect it before marking the baseline as applied. For a new empty database, deploy migrations normally.
