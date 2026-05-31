/**
 * AES-256-GCM encryption helpers for storing sensitive email provider credentials at rest.
 * Uses the JWT_SECRET env var as the key material (PBKDF2-derived).
 */
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const SALT = "educhamp-email-settings-v1"; // fixed salt — key derivation only

function deriveKey(): Buffer {
  const secret = process.env.JWT_SECRET ?? "dev-fallback-secret-change-in-prod";
  return pbkdf2Sync(secret, SALT, 100_000, 32, "sha256");
}

/**
 * Encrypt a plaintext string. Returns a base64-encoded string:
 * `iv:authTag:ciphertext`
 */
export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

/**
 * Decrypt a value produced by `encryptSecret`. Returns the original plaintext.
 * Throws if the ciphertext is invalid or tampered.
 */
export function decryptSecret(ciphertext: string): string {
  const key = deriveKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format");
  const [ivB64, authTagB64, encryptedB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

/**
 * Mask an API key for display: show only the last 4 characters.
 * e.g. "re_abc123xyz" → "••••••••xyz"
 */
export function maskApiKey(key: string): string {
  if (!key || key.length <= 4) return "••••";
  return "••••••••" + key.slice(-4);
}

/**
 * Returns true if the given value looks like an encrypted ciphertext
 * (i.e. was produced by encryptSecret — contains two colons separating base64 segments).
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  return parts.length === 3 && parts.every((p) => /^[A-Za-z0-9+/=]+$/.test(p));
}
