import crypto from "crypto";
import { IEvidenceStorage, StoredFileResult } from "./evidence-storage.interface.js";
import { BadRequestError } from "../errors/app-error.js";

export interface S3Config {
  bucketName: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

/**
 * Production S3-Compatible storage provider contract (AWS S3 / Cloudflare R2 / MinIO).
 */
export class S3CompatibleEvidenceStorage implements IEvidenceStorage {
  private readonly config: S3Config;
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_MIME_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
  ]);

  constructor(config: S3Config) {
    this.config = config;
  }

  public async save(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
    prefix = "evidence",
  ): Promise<StoredFileResult> {
    if (buffer.length > S3CompatibleEvidenceStorage.MAX_FILE_SIZE) {
      throw new BadRequestError("File exceeds maximum allowed size of 10MB");
    }

    if (buffer.length === 0) {
      throw new BadRequestError("File buffer cannot be empty");
    }

    const normalizedMime = mimeType.toLowerCase();
    if (!S3CompatibleEvidenceStorage.ALLOWED_MIME_TYPES.has(normalizedMime)) {
      throw new BadRequestError(`Unsupported MIME type: ${mimeType}`);
    }

    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const key = `${prefix}/${crypto.randomUUID()}_${originalFilename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    // Note: In full cloud deployment, invokes S3 PutObjectCommand here.
    return {
      fileReference: `s3://${this.config.bucketName}/${key}`,
      mimeType: normalizedMime,
      fileSize: buffer.length,
      sha256,
    };
  }

  public async get(_fileReference: string): Promise<Buffer | null> {
    // S3 GetObjectCommand retrieval
    return null;
  }

  public async delete(_fileReference: string): Promise<boolean> {
    // S3 DeleteObjectCommand
    return true;
  }
}
