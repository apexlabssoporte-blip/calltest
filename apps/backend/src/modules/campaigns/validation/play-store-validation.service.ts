import { PlayStoreValidationStatus } from "@calltest/shared-types";
import { SsrfGuard } from "../../../core/security/ssrf-guard.js";

export interface PlayStoreValidationResult {
  validUrl: boolean;
  reachable: boolean;
  packageName: string | null;
  packageMatches: boolean;
  isPubliclyAvailable: boolean;
  checkedAt: Date;
  status: PlayStoreValidationStatus;
  errorCode?: string;
  message: string;
}

export class PlayStoreValidationService {
  private static readonly ALLOWED_HOSTS = ["play.google.com"];

  /**
   * Validates Play Store testing or production link with package name consistency and SSRF guard.
   */
  public static async validatePlayStoreUrl(
    url?: string | null,
    expectedPackageName?: string | null,
  ): Promise<PlayStoreValidationResult> {
    const checkedAt = new Date();

    if (!url || typeof url !== "string" || url.trim() === "") {
      return {
        validUrl: false,
        reachable: false,
        packageName: null,
        packageMatches: false,
        isPubliclyAvailable: false,
        checkedAt,
        status: PlayStoreValidationStatus.ERROR,
        errorCode: "EMPTY_URL",
        message: "Play Store URL is required",
      };
    }

    const trimmedUrl = url.trim();

    // 1. SSRF Guard & Host Validation
    const ssrfCheck = SsrfGuard.isSafeUrl(trimmedUrl, this.ALLOWED_HOSTS);
    if (!ssrfCheck.isSafe || !ssrfCheck.parsedUrl) {
      return {
        validUrl: false,
        reachable: false,
        packageName: null,
        packageMatches: false,
        isPubliclyAvailable: false,
        checkedAt,
        status: PlayStoreValidationStatus.ERROR,
        errorCode: ssrfCheck.reason || "INVALID_URL",
        message: `Invalid or untrusted Play Store URL: ${ssrfCheck.reason}`,
      };
    }

    const searchParams = ssrfCheck.parsedUrl.searchParams;
    const extractedPackage = searchParams.get("id");

    if (!extractedPackage) {
      return {
        validUrl: false,
        reachable: false,
        packageName: null,
        packageMatches: false,
        isPubliclyAvailable: false,
        checkedAt,
        status: PlayStoreValidationStatus.ERROR,
        errorCode: "MISSING_PACKAGE_PARAM",
        message: "Play Store URL is missing the '?id=package.name' query parameter",
      };
    }

    // 2. Package Match Check
    const packageMatches = expectedPackageName
      ? extractedPackage.trim() === expectedPackageName.trim()
      : true;

    if (!packageMatches) {
      return {
        validUrl: true,
        reachable: true,
        packageName: extractedPackage,
        packageMatches: false,
        isPubliclyAvailable: false,
        checkedAt,
        status: PlayStoreValidationStatus.ERROR,
        errorCode: "PACKAGE_MISMATCH",
        message: `URL package (${extractedPackage}) does not match application package (${expectedPackageName})`,
      };
    }

    // 3. Testing track vs Public track detection
    // Closed testing tracks often use testing link or closed beta params
    const pathname = ssrfCheck.parsedUrl.pathname;
    const isTestingTrack = pathname.includes("/apps/testing/") || trimmedUrl.includes("/testing/");

    const determinedStatus: PlayStoreValidationStatus = isTestingTrack
      ? PlayStoreValidationStatus.TESTING
      : PlayStoreValidationStatus.PUBLIC;

    return {
      validUrl: true,
      reachable: true,
      packageName: extractedPackage,
      packageMatches: true,
      isPubliclyAvailable: determinedStatus === PlayStoreValidationStatus.PUBLIC,
      checkedAt,
      status: determinedStatus,
      message: isTestingTrack
        ? "Play Store closed testing link is valid and matches package name"
        : "Play Store public listing link is valid and matches package name",
    };
  }
}
