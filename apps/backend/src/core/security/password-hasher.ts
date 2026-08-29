import crypto from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(crypto.scrypt);

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

export class PasswordHasher {
  /**
   * Hashes a plain-text password using Node.js crypto.scrypt with a unique random salt.
   * Format: salt:derivedKeyHex
   */
  public static async hash(password: string): Promise<string> {
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
    const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

    return `${salt}:${derivedKey.toString("hex")}`;
  }

  /**
   * Verifies a password against a stored salt:hash string using timingSafeEqual.
   */
  public static async verify(password: string, storedHash: string): Promise<boolean> {
    if (!password || !storedHash) {
      return false;
    }

    const parts = storedHash.split(":");
    if (parts.length !== 2) {
      return false;
    }

    const [salt, expectedHashHex] = parts;
    const expectedBuffer = Buffer.from(expectedHashHex, "hex");

    if (expectedBuffer.length !== KEY_LENGTH) {
      return false;
    }

    const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

    return crypto.timingSafeEqual(derivedKey, expectedBuffer);
  }
}
