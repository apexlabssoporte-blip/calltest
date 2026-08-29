import { describe, it, expect } from "vitest";
import { MissionQualityService } from "../src/modules/missions/quality-service.js";

describe("MissionQualityService", () => {
  it("should validate a well-structured mission", () => {
    const result = MissionQualityService.assessQuality({
      title: "Explorar flujo de checkout",
      objective: "Completar la selección de un producto y verificar el resumen del carrito.",
      steps: [
        "Abrir la pestaña de catálogo.",
        "Seleccionar el producto 'Demo Item'.",
        "Presionar 'Añadir al carrito'.",
        "Verificar que el contador del carrito muestre 1.",
      ],
      estimatedMinutes: 8,
    });

    expect(result.status).toBe("VALID");
  });

  it("should reject a mission with too few characters in title or objective", () => {
    const result = MissionQualityService.assessQuality({
      title: "Hi",
      objective: "Short",
      steps: ["Step 1", "Step 2"],
      estimatedMinutes: 5,
    });

    expect(result.status).toBe("REJECTED");
    expect(result.reason).toBe("TOO_VAGUE");
  });

  it("should reject a mission with no steps", () => {
    const result = MissionQualityService.assessQuality({
      title: "Valid Title Here",
      objective: "Valid objective with enough characters",
      steps: [],
      estimatedMinutes: 5,
    });

    expect(result.status).toBe("REJECTED");
    expect(result.reason).toBe("NO_STEPS");
  });

  it("should reject a mission exceeding maximum allowable steps (TOO_COMPLEX)", () => {
    const steps = Array.from({ length: 20 }, (_, i) => `Paso número ${i + 1} de la prueba.`);

    const result = MissionQualityService.assessQuality({
      title: "Misión con demasiados pasos",
      objective: "Esta misión tiene demasiados pasos para un solo flujo.",
      steps,
      estimatedMinutes: 25,
    });

    expect(result.status).toBe("REJECTED");
    expect(result.reason).toBe("TOO_COMPLEX");
  });

  it("should reject a mission exceeding maximum allowable duration (TOO_LONG)", () => {
    const result = MissionQualityService.assessQuality({
      title: "Misión excesivamente larga",
      objective: "Esta misión requiere demasiado tiempo continuo del tester.",
      steps: ["Paso 1", "Paso 2"],
      estimatedMinutes: 120, // max is 60 by default
    });

    expect(result.status).toBe("REJECTED");
    expect(result.reason).toBe("TOO_LONG");
  });

  it("should reject a mission attempting too many disparate subsystem actions (TOO_COMPLEX)", () => {
    // Example from prompt: Regístrate, configura perfil, invita 3 amigos, compra un producto, completa checkout, sube una foto y configura notificaciones
    const result = MissionQualityService.assessQuality({
      title: "Flujo omnicanal masivo",
      objective: "Regístrate, configura perfil, invita 3 amigos, compra un producto, completa checkout, sube una foto y configura notificaciones.",
      steps: [
        "Regístrate con tu correo.",
        "Configura tu perfil con foto.",
        "Invita a 3 amigos.",
        "Compra un producto en la tienda.",
        "Completa checkout y sube comprobante.",
        "Configura notificaciones.",
      ],
      estimatedMinutes: 30,
    });

    expect(result.status).toBe("REJECTED");
    expect(result.reason).toBe("TOO_COMPLEX");
  });

  it("should return WARNING for high complexity but acceptable bounds", () => {
    const steps = Array.from({ length: 11 }, (_, i) => `Paso ${i + 1} simple.`);

    const result = MissionQualityService.assessQuality({
      title: "Misión moderadamente larga",
      objective: "Esta misión tiene 11 pasos simples que están dentro del límite.",
      steps,
      estimatedMinutes: 15,
    });

    expect(result.status).toBe("WARNING");
    expect(result.reason).toBe("MODERATE_COMPLEXITY");
  });
});
