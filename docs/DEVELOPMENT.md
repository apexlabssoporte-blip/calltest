# CallTest V1 — Development Guide

## Prerequisites

- Node.js >= 20.18.0 (LTS)
- npm >= 10.0.0
- Docker & Docker Compose (for local PostgreSQL and Redis)
- Android Studio / Android SDK (API 35, JDK 17)

## Quick Start

1. **Clone and Install Dependencies:**

   ```bash
   cd calltest
   npm install
   ```

2. **Environment Variables:**

   ```bash
   cp .env.example .env
   ```

3. **Start Infrastructure (PostgreSQL & Redis):**

   ```bash
   docker compose up -d
   ```

4. **Generate Prisma ORM Client:**

   ```bash
   npm run db:generate
   ```

5. **Run Backend in Development Mode:**

   ```bash
   npm run dev:backend
   ```
   - Server runs on: `http://localhost:3000`
   - OpenAPI Docs / Swagger UI: `http://localhost:3000/docs`
   - Liveness Probe: `http://localhost:3000/health/live`
   - Readiness Probe: `http://localhost:3000/health/ready`

6. **Run Tests:**

   ```bash
   npm test
   ```

7. **Compile & Check Types:**
   ```bash
   npm run build
   ```
