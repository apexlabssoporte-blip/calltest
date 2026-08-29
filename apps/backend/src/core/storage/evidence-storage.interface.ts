export interface StoredFileResult {
  fileReference: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
}

export interface IEvidenceStorage {
  save(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
    prefix?: string,
  ): Promise<StoredFileResult>;

  get(fileReference: string): Promise<Buffer | null>;

  delete(fileReference: string): Promise<boolean>;
}
