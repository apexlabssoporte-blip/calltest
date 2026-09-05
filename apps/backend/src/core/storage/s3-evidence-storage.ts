import crypto from "crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
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
  private readonly client: S3Client;
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_MIME_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
  ]);

  constructor(config: S3Config) {
    this.config = config;
    this.client = new S3Client({
      region: config.region || "auto",
      endpoint: config.endpoint,
      forcePathStyle: Boolean(config.endpoint),
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }
          : undefined,
    });
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

    if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
      throw new BadRequestError("Executable files (PE/EXE) are strictly prohibited");
    }
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x7f &&
      buffer[1] === 0x45 &&
      buffer[2] === 0x4c &&
      buffer[3] === 0x46
    ) {
      throw new BadRequestError("Executable files (ELF) are strictly prohibited");
    }

    const headerSnippet = buffer
      .toString("utf8", 0, Math.min(buffer.length, 50))
      .toLowerCase();
    if (
      headerSnippet.includes("<script") ||
      headerSnippet.includes("<?php") ||
      headerSnippet.includes("<!doctype html")
    ) {
      throw new BadRequestError("Script or HTML payloads are strictly prohibited as image evidence");
    }

    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const key = `${prefix}/${crypto.randomUUID()}_${originalFilename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: buffer,
        ContentType: normalizedMime,
        ServerSideEncryption: "AES256",
        Metadata: { sha256 },
      }),
    );

    return {
      fileReference: `s3://${this.config.bucketName}/${key}`,
      mimeType: normalizedMime,
      fileSize: buffer.length,
      sha256,
    };
  }

  public async get(fileReference: string): Promise<Buffer | null> {
    const key = this.keyFromReference(fileReference);
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.config.bucketName, Key: key }),
      );
      if (!result.Body) return null;
      return Buffer.from(await result.Body.transformToByteArray());
    } catch (error: unknown) {
      const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode;
      if (statusCode === 404) return null;
      throw error;
    }
  }

  public async delete(fileReference: string): Promise<boolean> {
    const key = this.keyFromReference(fileReference);
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucketName, Key: key }),
    );
    return true;
  }

  private keyFromReference(fileReference: string): string {
    const prefix = `s3://${this.config.bucketName}/`;
    if (!fileReference.startsWith(prefix)) {
      throw new BadRequestError("Invalid S3 evidence reference");
    }

    const key = fileReference.slice(prefix.length);
    if (!key || key.includes("..")) {
      throw new BadRequestError("Invalid S3 evidence reference");
    }
    return key;
  }
}
