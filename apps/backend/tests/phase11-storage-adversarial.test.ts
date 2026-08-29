import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocalEvidenceStorage } from "../src/core/storage/local-evidence-storage.js";
import fs from "fs/promises";

describe("Phase 11.1: Evidence Storage Hardening & Adversarial Tests", () => {
  const storage = new LocalEvidenceStorage();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(fs, "mkdir").mockResolvedValue(undefined as any);
    vi.spyOn(fs, "writeFile").mockResolvedValue(undefined as any);
  });

  describe("1. MIME & Magic Byte Validation", () => {
    it("should reject Fake MIME type", async () => {
      const buffer = Buffer.from("arbitrary text");
      await expect(
        storage.save(buffer, "test.txt", "text/plain"),
      ).rejects.toThrow(/Unsupported MIME type/i);
    });

    it("should reject Windows Executable (PE MZ header) disguised as .jpg", async () => {
      const mzHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
      await expect(
        storage.save(mzHeader, "virus.jpg", "image/jpeg"),
      ).rejects.toThrow(/Executable files/i);
    });

    it("should reject Linux ELF Executable disguised as .png", async () => {
      const elfHeader = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01]);
      await expect(
        storage.save(elfHeader, "exploit.png", "image/png"),
      ).rejects.toThrow(/Executable files/i);
    });
  });

  describe("2. File Size Boundaries", () => {
    it("should reject empty buffer (0 bytes)", async () => {
      const emptyBuffer = Buffer.alloc(0);
      await expect(
        storage.save(emptyBuffer, "empty.png", "image/png"),
      ).rejects.toThrow(/empty/i);
    });

    it("should reject oversized file (> 10MB)", async () => {
      const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024);
      await expect(
        storage.save(oversizedBuffer, "huge.png", "image/png"),
      ).rejects.toThrow(/exceeds maximum allowed size/i);
    });
  });

  describe("3. Path Traversal Prevention", () => {
    it("should sanitize path traversal attempts in prefix and filename", async () => {
      const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

      const result = await storage.save(validPng, "../../../etc/passwd.png", "image/png", "../../dangerous");

      expect(result.fileReference).not.toContain("..");
      expect(result.fileReference).not.toContain("passwd");
      expect(result.sha256).toBeDefined();
    });
  });

  describe("4. Valid Image Uploads & SHA-256", () => {
    it("should accept valid PNG with proper magic bytes and compute SHA-256", async () => {
      const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02]);

      const result = await storage.save(validPng, "screenshot.png", "image/png");

      expect(result.mimeType).toBe("image/png");
      expect(result.fileSize).toBe(validPng.length);
      expect(result.sha256.length).toBe(64);
    });

    it("should accept valid JPEG with proper magic bytes and compute SHA-256", async () => {
      const validJpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

      const result = await storage.save(validJpg, "photo.jpg", "image/jpeg");

      expect(result.mimeType).toBe("image/jpeg");
      expect(result.fileSize).toBe(validJpg.length);
      expect(result.sha256.length).toBe(64);
    });
  });
});
