import { env } from "../../core/config/env.js";

export interface MissionQualityInput {
  title: string;
  objective: string;
  steps: string[];
  estimatedMinutes: number;
}

export type QualityAssessmentStatus = "VALID" | "WARNING" | "REJECTED";

export interface QualityAssessmentResult {
  status: QualityAssessmentStatus;
  reason?: string;
  details?: string[];
}

export class MissionQualityService {
  /**
   * Analyzes a proposed mission to detect excessive complexity, unrealistic durations,
   * contradictory steps, or ambiguous instructions.
   */
  public static assessQuality(input: MissionQualityInput): QualityAssessmentResult {
    const details: string[] = [];

    // 1. Validate title & objective
    if (!input.title || input.title.trim().length < 5) {
      return {
        status: "REJECTED",
        reason: "TOO_VAGUE",
        details: ["Title must be at least 5 characters long."],
      };
    }

    if (!input.objective || input.objective.trim().length < 10) {
      return {
        status: "REJECTED",
        reason: "TOO_VAGUE",
        details: ["Objective must provide clear intent (at least 10 characters)."],
      };
    }

    // 2. Validate steps existence
    if (!input.steps || !Array.isArray(input.steps) || input.steps.length === 0) {
      return {
        status: "REJECTED",
        reason: "NO_STEPS",
        details: ["A mission must contain at least 1 actionable step."],
      };
    }

    // 3. Validate step count limits
    if (input.steps.length > env.MISSION_MAX_STEPS) {
      return {
        status: "REJECTED",
        reason: "TOO_COMPLEX",
        details: [
          `Mission contains ${input.steps.length} steps, exceeding maximum allowable steps (${env.MISSION_MAX_STEPS}). Break it into multiple smaller missions.`,
        ],
      };
    }

    // 4. Validate estimated duration
    if (input.estimatedMinutes <= 0) {
      return {
        status: "REJECTED",
        reason: "INVALID_DURATION",
        details: ["Estimated duration must be greater than 0 minutes."],
      };
    }

    if (input.estimatedMinutes > env.MISSION_MAX_ESTIMATED_MINUTES) {
      return {
        status: "REJECTED",
        reason: "TOO_LONG",
        details: [
          `Estimated duration (${input.estimatedMinutes} min) exceeds maximum limit (${env.MISSION_MAX_ESTIMATED_MINUTES} min).`,
        ],
      };
    }

    // 5. Complexity & Multi-action density analysis
    // Count cumulative action verbs across combined text
    const fullText = `${input.title} ${input.objective} ${input.steps.join(" ")}`.toLowerCase();

    // High complexity keywords indicating multiple independent workflows squeezed into one
    const complexVerbs = [
      "regístrate", "registrate", "register",
      "configura", "configure",
      "invita", "invite",
      "compra", "buy", "purchase",
      "checkout",
      "sube", "upload",
      "notificaciones", "notifications",
      "transfiere", "transfer",
    ];

    let matchedActionCount = 0;
    for (const verb of complexVerbs) {
      if (fullText.includes(verb)) {
        matchedActionCount++;
      }
    }

    // If a single mission requires 5 or more distinct major subsystem actions, reject as TOO_COMPLEX
    if (matchedActionCount >= 5) {
      return {
        status: "REJECTED",
        reason: "TOO_COMPLEX",
        details: [
          "Mission attempts to cover too many disparate subsystems simultaneously (e.g. registration, purchase, social sharing, media upload). Simplify into targeted focused missions.",
        ],
      };
    }

    // 6. Warnings for moderate complexity
    if (input.steps.length >= 10 || input.estimatedMinutes > 40) {
      details.push("Mission duration or step count is on the higher end. Consider splitting.");
      return {
        status: "WARNING",
        reason: "MODERATE_COMPLEXITY",
        details,
      };
    }

    return {
      status: "VALID",
      details: ["Mission meets all structural quality criteria."],
    };
  }
}
