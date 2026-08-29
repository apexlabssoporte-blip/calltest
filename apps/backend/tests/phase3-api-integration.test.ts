import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/core/database/prisma.js";
import {
  UserRole,
  UserStatus,
  MissionDifficulty,
  MissionStatus,
  AttemptStatus,
  ValidationMethod,
  ActivityEventType,
  TesterStatus,
} from "@calltest/shared-types";

describe("Phase 3 API End-to-End Integration", () => {
  const app = buildApp();
  let devToken: string;
  let testerToken: string;

  const devUserId = "a0000000-0000-0000-0000-000000000001";
  const testerUserId = "a0000000-0000-0000-0000-000000000002";
  const campaignId = "c0000000-0000-0000-0000-000000000001";
  const missionId = "d0000000-0000-0000-0000-000000000001";
  const campaignTesterId = "e0000000-0000-0000-0000-000000000001";
  const attemptId = "f0000000-0000-0000-0000-000000000001";

  beforeAll(async () => {
    await app.ready();
    devToken = app.jwt.sign({ sub: devUserId, email: "dev@calltest.com", role: UserRole.DEVELOPER });
    testerToken = app.jwt.sign({ sub: testerUserId, email: "tester@calltest.com", role: UserRole.TESTER });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Mission Management Endpoints", () => {
    it("POST /campaigns/:campaignId/missions should create a mission", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devUserId,
        email: "dev@calltest.com",
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
        displayName: "Dev User",
      } as any);

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignId,
        app: { developerId: devUserId },
      } as any);

      vi.spyOn(prisma.mission, "create").mockResolvedValue({
        id: missionId,
        campaignId,
        title: "Completar Onboarding",
        description: "Recorrido inicial de la aplicación",
        objective: "Abrir la app y revisar las pantallas principales de bienvenida.",
        steps: ["Abrir app", "Ver bienvenida", "Tocar comenzar"],
        difficulty: MissionDifficulty.EASY,
        estimatedMinutes: 5,
        validationMethod: ValidationMethod.SDK_EVENT,
        status: MissionStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const response = await app.inject({
        method: "POST",
        url: `/campaigns/${campaignId}/missions`,
        headers: { authorization: `Bearer ${devToken}` },
        payload: {
          title: "Completar Onboarding",
          objective: "Abrir la app y revisar las pantallas principales de bienvenida.",
          steps: ["Abrir app", "Ver bienvenida", "Tocar comenzar"],
          difficulty: MissionDifficulty.EASY,
          estimatedMinutes: 5,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.title).toBe("Completar Onboarding");
      expect(body.status).toBe(MissionStatus.DRAFT);
    });

    it("POST /missions/:id/approve should approve mission to ACTIVE", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: devUserId,
        email: "dev@calltest.com",
        role: UserRole.DEVELOPER,
        status: UserStatus.ACTIVE,
        displayName: "Dev User",
      } as any);

      vi.spyOn(prisma.mission, "findUnique").mockResolvedValue({
        id: missionId,
        campaignId,
        status: MissionStatus.DRAFT,
      } as any);

      vi.spyOn(prisma.campaign, "findUnique").mockResolvedValue({
        id: campaignId,
        app: { developerId: devUserId },
      } as any);

      vi.spyOn(prisma.mission, "update").mockResolvedValue({
        id: missionId,
        campaignId,
        title: "Completar Onboarding",
        description: null,
        objective: "Objective here with enough chars",
        steps: ["Step 1", "Step 2"],
        difficulty: MissionDifficulty.EASY,
        estimatedMinutes: 5,
        validationMethod: ValidationMethod.SDK_EVENT,
        status: MissionStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const response = await app.inject({
        method: "POST",
        url: `/missions/${missionId}/approve`,
        headers: { authorization: `Bearer ${devToken}` },
        payload: { reason: "Verified by dev" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe(MissionStatus.ACTIVE);
    });
  });

  describe("Mission Attempt Endpoints", () => {
    it("POST /missions/:missionId/start should start attempt for tester", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: testerUserId,
        email: "tester@calltest.com",
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
        displayName: "Tester User",
      } as any);

      vi.spyOn(prisma.mission, "findUnique").mockResolvedValue({
        id: missionId,
        campaignId,
        status: MissionStatus.ACTIVE,
      } as any);

      vi.spyOn(prisma.campaignTester, "findFirst").mockResolvedValue({
        id: campaignTesterId,
        campaignId,
        testerId: testerUserId,
        status: TesterStatus.ACTIVE,
      } as any);

      vi.spyOn(prisma.missionAttempt, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.missionAttempt, "create").mockResolvedValue({
        id: attemptId,
        missionId,
        campaignTesterId,
        testerId: testerUserId,
        status: AttemptStatus.STARTED,
        attemptCount: 1,
        validationStatus: null,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const response = await app.inject({
        method: "POST",
        url: `/missions/${missionId}/start`,
        headers: { authorization: `Bearer ${testerToken}` },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.status).toBe(AttemptStatus.STARTED);
    });

    it("POST /mission-attempts/:id/submit should submit and auto-validate attempt", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: testerUserId,
        email: "tester@calltest.com",
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
        displayName: "Tester User",
      } as any);

      vi.spyOn(prisma.missionAttempt, "findUnique").mockResolvedValue({
        id: attemptId,
        missionId,
        campaignTesterId,
        testerId: testerUserId,
        status: AttemptStatus.STARTED,
        mission: {
          id: missionId,
          campaignId,
          validationMethod: ValidationMethod.SDK_EVENT,
        },
        campaignTester: {
          id: campaignTesterId,
        },
      } as any);

      vi.spyOn(prisma.missionAttempt, "update").mockResolvedValue({
        id: attemptId,
        missionId,
        campaignTesterId,
        testerId: testerUserId,
        status: AttemptStatus.VALIDATED,
        attemptCount: 1,
        validationStatus: "AUTO_VALIDATED",
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        mission: {
          id: missionId,
          campaignId,
          validationMethod: ValidationMethod.SDK_EVENT,
        },
        campaignTester: {
          id: campaignTesterId,
        },
      } as any);
      vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);

      const response = await app.inject({
        method: "POST",
        url: `/mission-attempts/${attemptId}/submit`,
        headers: { authorization: `Bearer ${testerToken}` },
        payload: {
          proofData: { completed: true },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe(AttemptStatus.VALIDATED);
    });
  });

  describe("Activity Telemetry Ingestion Endpoint", () => {
    it("POST /activity/events should ingest event", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: testerUserId,
        email: "tester@calltest.com",
        role: UserRole.TESTER,
        status: UserStatus.ACTIVE,
        displayName: "Tester User",
      } as any);

      vi.spyOn(prisma.activityEvent, "findUnique").mockResolvedValue(null);
      vi.spyOn(prisma.activityEvent, "create").mockResolvedValue({
        id: "evt-uuid-1",
        appId: "a0000000-0000-0000-0000-000000000001",
        testerId: testerUserId,
        sessionId: "session-100",
        eventType: ActivityEventType.SCREEN_VIEW,
        clientTimestamp: new Date(),
        serverTimestamp: new Date(),
        isValid: true,
        idempotencyKey: "client-idempotency-100",
      } as any);
      vi.spyOn(prisma.sessionRecord, "findUnique").mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/activity/events",
        headers: { authorization: `Bearer ${testerToken}` },
        payload: {
          eventId: "client-idempotency-100",
          appId: "a0000000-0000-0000-0000-000000000001",
          sessionId: "session-100",
          eventType: ActivityEventType.SCREEN_VIEW,
          clientTimestamp: new Date().toISOString(),
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe("evt-uuid-1");
      expect(body.isDuplicate).toBe(false);
    });
  });
});
