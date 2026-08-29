import { prisma } from "../../../core/database/prisma.js";
import { PlayStoreValidationStatus, AppStatus } from "@calltest/shared-types";
import { PlayStoreValidationService } from "../validation/play-store-validation.service.js";

export interface PublicationStatusResult {
  appId: string;
  developerReportedStatus: AppStatus;
  callTestVerifiedStatus: PlayStoreValidationStatus;
  isPubliclyVerified: boolean;
  verifiedAt: Date | null;
  message: string;
}

export class AppPublicationStatusService {
  /**
   * Verifies if an application is truly published and accessible publicly on Google Play.
   * Enforces the separation between Developer reported claims and CallTest independent verification.
   */
  public static async evaluatePublicationStatus(appId: string): Promise<PublicationStatusResult> {
    const app = await prisma.app.findUnique({
      where: { id: appId },
    });

    if (!app) {
      throw new Error("Application not found");
    }

    const developerReportedStatus = app.status;

    // Execute CallTest independent validation
    const validationResult = await PlayStoreValidationService.validatePlayStoreUrl(
      app.playStoreUrl,
      app.packageName,
    );

    const isPubliclyVerified =
      developerReportedStatus === AppStatus.PUBLIC &&
      validationResult.status === PlayStoreValidationStatus.PUBLIC &&
      validationResult.packageMatches;

    const verifiedAt = isPubliclyVerified ? new Date() : null;

    return {
      appId,
      developerReportedStatus: developerReportedStatus as unknown as AppStatus,
      callTestVerifiedStatus: validationResult.status,
      isPubliclyVerified,
      verifiedAt,
      message: isPubliclyVerified
        ? "Application publication status successfully verified by CallTest"
        : "Application publication cannot be verified as public yet",
    };
  }
}
