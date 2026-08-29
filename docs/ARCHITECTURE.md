# CallTest V1 — Architecture Specification

## 1. Overview & System Topology

CallTest is a platform connecting Android application developers with real testers for 14-day closed testing cycles required for Google Play production releases.

The platform is structured as a **Modular Monolith** containing:

- **Backend (`apps/backend`)**: Fastify 5 REST API + TypeBox + PostgreSQL (Prisma) + Redis + In-Memory Domain Event Bus.
- **Android App (`apps/android/app`)**: Kotlin Jetpack Compose app for testers.
- **CallTest SDK (`apps/android/sdk`)**: Embedded client library for developer apps.
- **API Contract (`packages/api-contract`)**: Universal OpenAPI 3.0.3 contract as the single source of truth between Backend and Android.
- **Shared Types (`packages/shared-types`)**: Internal TypeScript enums and domain types.

```mermaid
graph TD
    A[Tester Android App] -->|HTTPS REST| GW[Fastify Gateway / OpenAPI]
    B[Developer App + CallTest SDK] -->|HTTPS Telemetry| GW
    C[Developer Web Dashboard] -->|HTTPS REST| GW

    subgraph "Modular Monolith Backend"
        GW --> M_AUTH[auth]
        GW --> M_USERS[users]
        GW --> M_APPS[apps]
        GW --> M_CAMP[campaigns]
        GW --> M_CTEST[campaign-testers]
        GW --> M_MISS[missions]
        GW --> M_MATT[mission-attempts]
        GW --> M_ACT[activity]
        GW --> M_FEED[feedback]
        GW --> M_BUGS[bugs]
        GW --> M_TRUST[trust]
        GW --> M_REW[rewards]
        GW --> M_MATCH[matching]
        GW --> M_NOTIF[notifications]
        GW --> M_FRAUD[fraud]
        GW --> M_AUDIT[audit]
        GW --> M_HEALTH[health]

        M_CAMP <--> BUS[DomainEventBus]
        M_TRUST <--> BUS
        M_REW <--> BUS

        M_HEALTH --> DB[(PostgreSQL)]
        M_HEALTH --> REDIS[(Redis)]
    end
```

## 2. Core Modules

Each module inside `apps/backend/src/modules/` adheres strictly to layered architecture:

- `routes.ts`: Fastify route definitions with TypeBox request/response schemas.
- `handlers.ts`: HTTP request/reply lifecycle management.
- `service.ts`: Pure business rules and orchestration.
- `repository.ts`: Persistence abstraction over Prisma Client.
- `schemas.ts`: TypeBox schema definitions.
- `*.test.ts`: Automated tests with Vitest.

## 3. Zero-Trust Client Philosophy

The backend is the sole authority for:

- Mission completion validation.
- XP and Gold rewards (strictly idempotent with unique compound keys).
- Trust score adjustments and rank recalculations.
- Campaign lifecycle transitions.
- Tester replacement assignments.
