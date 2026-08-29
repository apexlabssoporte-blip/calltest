import { MissionDifficulty, ValidationMethod } from "@calltest/shared-types";

export interface GenerateMissionsInput {
  appDescription: string;
  appFeatures?: string[];
  appCategory?: string;
  targetFunctionality?: string;
  hasCallTestSdk?: boolean;
}

export interface MissionDraft {
  title: string;
  description?: string;
  objective: string;
  steps: string[];
  difficulty: MissionDifficulty;
  estimatedMinutes: number;
  validationMethod: ValidationMethod;
  requiresEvidence?: boolean;
  evidenceInstructions?: string;
}

export interface MissionGenerator {
  generateMissions(input: GenerateMissionsInput): Promise<MissionDraft[]>;
}

/**
 * Standard rule-based / template implementation of MissionGenerator.
 * Designed to decouple domain logic from specific external LLM vendors.
 * Adapts evidence requirements based on whether app includes CallTest SDK.
 */
export class TemplateMissionGenerator implements MissionGenerator {
  public async generateMissions(input: GenerateMissionsInput): Promise<MissionDraft[]> {
    const drafts: MissionDraft[] = [];
    const hasSdk = input.hasCallTestSdk === true;

    // Draft 1: First Onboarding & Core Navigation
    drafts.push({
      title: "Exploración Inicial y Navegación Básica",
      description: "Recorrido de primera impresión y onboarding de la aplicación.",
      objective: "Abrir la aplicación, completar la pantalla de bienvenida y acceder al menú principal.",
      steps: [
        "Abrir la aplicación desde el launcher.",
        "Completar o saltar el tutorial de introducción.",
        "Navegar por las 3 pestañas principales de la barra inferior.",
        "Verificar que los elementos visuales carguen sin cierres inesperados.",
      ],
      difficulty: MissionDifficulty.EASY,
      estimatedMinutes: 5,
      validationMethod: hasSdk ? ValidationMethod.SDK_EVENT : ValidationMethod.MANUAL,
      requiresEvidence: !hasSdk,
      evidenceInstructions: hasSdk
        ? undefined
        : "Captura la pantalla principal de la aplicación después de abrirla.",
    });

    // Draft 2: Core Feature Workflow
    const featureName = input.targetFunctionality || input.appFeatures?.[0] || "Funcionalidad Principal";
    drafts.push({
      title: `Prueba Funcional: ${featureName}`,
      description: `Ejecutar el flujo principal asociado a ${featureName}.`,
      objective: `Interactuar con ${featureName} y registrar cualquier comportamiento anómalo.`,
      steps: [
        `Acceder a la sección de ${featureName}.`,
        "Ingresar datos de prueba válidos.",
        "Presionar el botón de confirmar / procesar.",
        "Verificar la respuesta en pantalla o mensaje de confirmación.",
      ],
      difficulty: MissionDifficulty.MEDIUM,
      estimatedMinutes: 12,
      validationMethod: hasSdk ? ValidationMethod.EVENT : ValidationMethod.MANUAL,
      requiresEvidence: !hasSdk,
      evidenceInstructions: hasSdk
        ? undefined
        : `Captura la pantalla de confirmación o resultado de ${featureName}.`,
    });

    return drafts;
  }
}
