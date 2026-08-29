# CallTest V1 — Architecture Decision Records (ADR)

## ADR-001: Modular Monolith over Microservices

- **Status:** Accepted
- **Context:** CallTest V1 requires fast development iteration, straightforward deployment, and strong consistency across domains.
- **Decision:** Build as a single Modular Monolith with strictly separated domain modules communicating via in-process DomainEventBus.
- **Consequences:** Low operational complexity, effortless local development, with a clear migration path to independent microservices if scale demands.

## ADR-002: Fastify 5 + TypeBox Single Source of Truth

- **Status:** Accepted
- **Context:** Multiple validation libraries (e.g. mixing Zod and TypeBox) cause type duplication and maintenance overhead.
- **Decision:** Use TypeBox (`@sinclair/typebox` and `@fastify/type-provider-typebox`) as the sole HTTP validation and schema engine.
- **Consequences:** High-performance JSON schema compilation, automatic OpenAPI spec generation, and zero duplication.

## ADR-003: OpenAPI as Universal Contract for Android & Backend

- **Status:** Accepted
- **Context:** Kotlin Android client and TypeScript backend must share a strictly versioned API contract.
- **Decision:** `packages/api-contract` maintains the OpenAPI 3.0.3 spec as the single source of truth from which client models/code are generated.
- **Consequences:** Eliminates manual DTO syncing between TypeScript and Kotlin.

## ADR-004: In-Memory Domain Event Bus in Phase 1

- **Status:** Accepted
- **Context:** Modules need decoupled event notifications without heavy queue infrastructure in Foundation phase.
- **Decision:** Implement lightweight `DomainEventBus` in memory; reserve Redis for distributed cache and locks.
