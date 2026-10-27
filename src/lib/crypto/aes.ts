/**
 * KDROP Hardware-Accelerated AES-256-GCM Cryptographic Implementation
 * Zero-Knowledge client-side encryption using W3C Web Cryptography API.
 */

import {
  bufferToBase64Url,
  base64UrlToBuffer,
  getRandomBytes,
  stringToBytes,
} from "./utils";

const AES_ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM per NIST SP 800-38D

/**
 * Generates an ephemeral 256-bit AES-GCM CryptoKey.
 */
export async function generateAESKey(): Promise<CryptoKey> {
  const subtle = window.crypto.subtle;
  return await subtle.generateKey(
    {
      name: AES_ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // extractable for URL fragment encoding
    ["encrypt", "decrypt"]
  );
}

/**
 * Exports a CryptoKey to a URL-safe Base64URL string.
 */
export async function exportKeyToBase64Url(key: CryptoKey): Promise<string> {
  const subtle = window.crypto.subtle;
  const raw = await subtle.exportKey("raw", key);
  return bufferToBase64Url(raw);
}

/**
 * Imports a 256-bit raw key from a Base64URL string into a CryptoKey.
 */
export async function importKeyFromBase64Url(base64UrlKey: string): Promise<CryptoKey> {
  const subtle = window.crypto.subtle;
  const rawBytes = base64UrlToBuffer(base64UrlKey);
  return await subtle.importKey(
    "raw",
    rawBytes as unknown as BufferSource,
    {
      name: AES_ALGORITHM,
      length: KEY_LENGTH,
    },
    false, // once imported in viewer, non-extractable for memory safety
    ["encrypt", "decrypt"]
  );
}

export interface EncryptedPayload {
  ciphertext: string; // Base64URL
  iv: string; // Base64URL
}

/**
 * Encrypts a string or binary buffer with AES-256-GCM.
 * A unique, cryptographically random 96-bit IV is generated for every operation.
 */
export async function encryptAESGCM(
  data: string | Uint8Array,
  key: CryptoKey
): Promise<EncryptedPayload> {
  const subtle = window.crypto.subtle;
  const iv = getRandomBytes(IV_LENGTH);
  const dataBytes = typeof data === "string" ? stringToBytes(data) : data;

  const encryptedBuffer = await subtle.encrypt(
    {
      name: AES_ALGORITHM,
      iv: iv as unknown as BufferSource,
      tagLength: 128, // 128-bit authentication tag for maximum integrity
    },
    key,
    dataBytes as unknown as BufferSource
  );

  return {
    ciphertext: bufferToBase64Url(encryptedBuffer),
    iv: bufferToBase64Url(iv),
  };
}

/**
 * Decrypts an authenticated AES-256-GCM payload.
 * Throws an error if the authentication tag fails (ciphertext was tampered with).
 */
export async function decryptAESGCM(
  ciphertextBase64Url: string,
  ivBase64Url: string,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const subtle = window.crypto.subtle;
  const ciphertextBytes = base64UrlToBuffer(ciphertextBase64Url);
  const ivBytes = base64UrlToBuffer(ivBase64Url);

  try {
    const decrypted = await subtle.decrypt(
      {
        name: AES_ALGORITHM,
        iv: ivBytes as unknown as BufferSource,
        tagLength: 128,
      },
      key,
      ciphertextBytes as unknown as BufferSource
    );
    return decrypted;
  } catch (error) {
    throw new Error("Decryption failed: Invalid key, wrong passphrase, or tampered payload.");
  }
}
