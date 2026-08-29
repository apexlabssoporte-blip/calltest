# CallTest V1

> Plataforma para conectar Developers de aplicaciones Android con Testers reales para pruebas cerradas de 14 días.

## Características de la Arquitectura

- **Monorepo:** NPM Workspaces (`apps/backend`, `apps/android`, `packages/*`).
- **Backend:** Fastify 5.x + TypeBox + PostgreSQL + Prisma ORM + Redis.
- **Android:** Kotlin + Jetpack Compose + Material 3 + SDK desacoplado.
- **Testing:** Vitest para backend y JUnit para Android / SDK.
- **Contrato Universal:** OpenAPI v3.0.3 (`packages/api-contract`).

## Inicio Rápido

Consulta la guía completa de desarrollo en [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) y la arquitectura en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
