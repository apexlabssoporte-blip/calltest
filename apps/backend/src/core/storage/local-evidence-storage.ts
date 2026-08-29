import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { IEvidenceStorage, StoredFileResult } from "./evidence-storage.interface.js";
import { BadRequestError } from "../errors/app-error.js";

export class LocalEvidenceStorage implements IEvidenceStorage {
  private readonly baseDir: string;
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_MIME_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
  ]);

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve(process.cwd(), "uploads", "evidence");
  }

  public async save(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
    prefix = "evidence",
  ): Promise<StoredFileResult> {
    // 1. Validate File Size
    if (buffer.length > LocalEvidenceStorage.MAX_FILE_SIZE) {
      throw new BadRequestError("File exceeds maximum allowed size of 10MB");
    }

    if (buffer.length === 0) {
      throw new BadRequestError("File buffer cannot be empty");
    }

    // 2. Validate MIME Type
    const normalizedMime = mimeType.toLowerCase();
    if (!LocalEvidenceStorage.ALLOWED_MIME_TYPES.has(normalizedMime)) {
      throw new BadRequestError(`Unsupported MIME type: ${mimeType}. Allowed types: image/png, image/jpeg, image/webp`);
    }

    // 2.1 Content Verification (Prevent executable files PE/ELF/scripts disguised as images)
    if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
      throw new BadRequestError("Executable files (PE/EXE) are strictly prohibited");
    }
    if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
      throw new BadRequestError("Executable files (ELF) are strictly prohibited");
    }

    const headerSnippet = buffer.toString("utf8", 0, Math.min(buffer.length, 50)).toLowerCase();
    if (headerSnippet.includes("<script") || headerSnippet.includes("<?php") || headerSnippet.includes("<!doctype html")) {
      throw new BadRequestError("Script or HTML payloads are strictly prohibited as image evidence");
    }

    // 3. Compute SHA-256 Hash
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    // 4. Determine sanitized extension
    let ext = path.extname(originalFilename).toLowerCase();
    if (!ext || ext === "." || !ext.match(/^\.[a-z0-9]+$/)) {
      if (normalizedMime === "image/png") ext = ".png";
      else if (normalizedMime === "image/jpeg") ext = ".jpg";
      else if (normalizedMime === "image/webp") ext = ".webp";
    }

    // Ensure server generates safe random filename and rejects any traversal inside prefix/name
    const sanitizedPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "");
    const uniqueName = `${sanitizedPrefix}_${crypto.randomUUID()}${ext}`;
    const safePath = path.join(this.baseDir, uniqueName);

    // Path traversal check
    const resolvedPath = path.resolve(safePath);
    if (!resolvedPath.startsWith(path.resolve(this.baseDir))) {
      throw new BadRequestError("Invalid file path / path traversal detected");
    }

    // Ensure directory exists and write
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.writeFile(resolvedPath, buffer);

    return {
      fileReference: uniqueName,
      mimeType: normalizedMime,
      fileSize: buffer.length,
      sha256,
    };
  }

  public async get(fileReference: string): Promise<Buffer | null> {
    const safePath = path.join(this.baseDir, fileReference);
    const resolvedPath = path.resolve(safePath);
    if (!resolvedPath.startsWith(path.resolve(this.baseDir))) {
      throw new BadRequestError("Invalid file reference");
    }

    try {
      return await fs.readFile(resolvedPath);
    } catch {
      return null;
    }
  }

  public async delete(fileReference: string): Promise<boolean> {
    const safePath = path.join(this.baseDir, fileReference);
    const resolvedPath = path.resolve(safePath);
    if (!resolvedPath.startsWith(path.resolve(this.baseDir))) {
      return false;
    }

    try {
      await fs.unlink(resolvedPath);
      return true;
    } catch {
      return false;
    }
  }
}
