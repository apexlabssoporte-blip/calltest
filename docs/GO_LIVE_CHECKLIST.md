# CallTest go-live checklist

## Completed in the repository

- Android targets API 36 and uses Android Gradle Plugin 8.11.1 with Gradle 8.13.
- Release version is `1.0.1` (`versionCode` 2).
- Real email/password registration and login are available.
- Demo login remains available only in debug builds and is visibly labelled.
- Release credentials and API URLs come from environment variables.
- Production health requires both PostgreSQL and Redis/Key Value.
- Render Blueprint defines a private `calltest-cache` Key Value service.
- Evidence supports private S3-compatible storage such as Cloudflare R2.
- CI validates backend, database migrations, Android tests, lint, and release assembly.
- Generated evidence files and signing keystores are excluded from Git.

## Owner actions required before pushing to production

1. Sign in to Render and configure `CORS_ORIGIN`, `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`.
2. Back up production PostgreSQL and verify its schema matches `apps/backend/prisma/schema.prisma`.
3. On the existing production database only, mark `20260905000000_baseline` as applied before enabling automatic migration deploys.
4. Sync the Render Blueprint so `calltest-cache` is created and `REDIS_URL` is wired automatically.
5. Deploy and require HTTP 200 from both `/health/live` and `/health/ready`.
6. Publish a legally reviewed privacy policy, terms of use, community rules, and external account-deletion request page.
7. Store the Android upload keystore outside the repository and generate a signed AAB.
8. Complete Google Play App content and Data safety forms, provide durable reviewer credentials, and run internal/closed testing.

Do not deploy the pending production configuration before steps 1–4 are complete. Production validation intentionally prevents startup with wildcard CORS or missing object-storage credentials.
