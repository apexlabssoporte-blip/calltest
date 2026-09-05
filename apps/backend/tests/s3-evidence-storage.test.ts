import { describe, expect, it } from "vitest";
import { S3CompatibleEvidenceStorage } from "../src/core/storage/s3-evidence-storage.js";

const storage = new S3CompatibleEvidenceStorage({
  bucketName: "calltest-test-evidence",
  region: "us-east-1",
  accessKeyId: "test",
  secretAccessKey: "test",
});

describe("S3-compatible evidence storage validation", () => {
  it("rejects executable content before sending anything to object storage", async () => {
    await expect(
      storage.save(Buffer.from([0x4d, 0x5a, 0x00]), "evidence.jpg", "image/jpeg"),
    ).rejects.toThrow("Executable files");
  });

  it("rejects references outside the configured private bucket", async () => {
    await expect(storage.get("s3://another-bucket/evidence/file.png")).rejects.toThrow(
      "Invalid S3 evidence reference",
    );
  });
});
