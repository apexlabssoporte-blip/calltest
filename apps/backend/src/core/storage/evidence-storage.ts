import { env } from "../config/env.js";
import { LocalEvidenceStorage } from "./local-evidence-storage.js";
import { S3CompatibleEvidenceStorage } from "./s3-evidence-storage.js";
import type { IEvidenceStorage } from "./evidence-storage.interface.js";

function createEvidenceStorage(): IEvidenceStorage {
  if (env.EVIDENCE_STORAGE_PROVIDER === "local") {
    return new LocalEvidenceStorage();
  }

  if (env.EVIDENCE_STORAGE_PROVIDER === "s3") {
    if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      throw new Error("S3 evidence storage is selected but its required configuration is missing");
    }

    return new S3CompatibleEvidenceStorage({
      bucketName: env.S3_BUCKET,
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    });
  }

  throw new Error(`Unsupported EVIDENCE_STORAGE_PROVIDER: ${env.EVIDENCE_STORAGE_PROVIDER}`);
}

export const evidenceStorage = createEvidenceStorage();
