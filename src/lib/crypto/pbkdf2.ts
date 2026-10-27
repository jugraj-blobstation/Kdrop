/**
 * KDROP Passphrase Key Derivation Implementation
 * Uses PBKDF2-HMAC-SHA256 with 600,000 iterations per OWASP recommendations.
 */

import { getRandomBytes, stringToBytes, bufferToBase64Url, base64UrlToBuffer } from "./utils";

const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 16; // 128-bit salt

/**
 * Generates a cryptographically secure random salt for PBKDF2.
 */
export function generateSalt(): Uint8Array {
  return getRandomBytes(SALT_LENGTH);
}

/**
 * Derives a 256-bit AES-GCM CryptoKey from a user passphrase and salt.
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array | string,
  iterations: number = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const subtle = window.crypto.subtle;
  const saltBytes = typeof salt === "string" ? base64UrlToBuffer(salt) : salt;
  const passphraseBytes = stringToBytes(passphrase);

  // Import passphrase as base key material
  const baseKey = await subtle.importKey(
    "raw",
    passphraseBytes as unknown as BufferSource,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  // Derive AES-GCM key
  const derivedKey = await subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes as unknown as BufferSource,
      iterations: iterations,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false, // derived key is non-extractable
    ["encrypt", "decrypt"]
  );

  return derivedKey;
}

export { bufferToBase64Url, base64UrlToBuffer };
