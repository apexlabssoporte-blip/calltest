import { SdkIntegrationStatus } from "@calltest/shared-types";
import { prisma } from "../../core/database/prisma.js";
import { AppError } from "../../core/errors/app-error.js";
import { SdkHandshakeRequest } from "./schemas.js";

export class SdkVerificationService {
  public static async verifyHandshake(data: SdkHandshakeRequest) {
    const registeredApp = await prisma.app.findUnique({
      where: { apiKey: data.apiKey },
    });

    if (!registeredApp) {
      throw new AppError(
        "La clave de CallTest no existe. Copia nuevamente la clave mostrada en tu app.",
        401,
        "SDK_INVALID_API_KEY",
      );
    }

    if (registeredApp.packageName !== data.packageName.trim()) {
      throw new AppError(
        `El paquete recibido (${data.packageName}) no coincide con ${registeredApp.packageName}.`,
        409,
        "SDK_PACKAGE_MISMATCH",
      );
    }

    if (
      registeredApp.sdkIntegrationStatus !== SdkIntegrationStatus.SDK_ENABLED ||
      !registeredApp.hasCallTestSdk
    ) {
      await prisma.app.update({
        where: { id: registeredApp.id },
        data: {
          sdkIntegrationStatus: SdkIntegrationStatus.SDK_ENABLED,
          hasCallTestSdk: true,
        },
      });
    }

    return {
      status: "CONNECTED" as const,
      appId: registeredApp.id,
      packageName: registeredApp.packageName,
      sdkVersion: data.sdkVersion,
    };
  }
}
