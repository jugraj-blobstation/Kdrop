/**
 * KDROP Cryptographic Utilities
 * Zero-Knowledge Client-Side Cryptography based on W3C Web Cryptography API.
 */

/**
 * Encodes an ArrayBuffer or Uint8Array into a Base64URL string (URL-safe, RFC 4648 §5).
 */
export function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Decodes a Base64URL string back into a Uint8Array.
 */
export function base64UrlToBuffer(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates cryptographically secure random bytes using window.crypto.
 */
export function getRandomBytes(byteLength: number): Uint8Array {
  const bytes = new Uint8Array(byteLength);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else {
    // Node.js fallback for tests / server evaluation
    const cryptoNode = require("crypto");
    const random = cryptoNode.randomBytes(byteLength);
    bytes.set(random);
  }
  return bytes;
}

/**
 * Converts a string to UTF-8 Uint8Array.
 */
export function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Converts UTF-8 Uint8Array or ArrayBuffer to a string.
 */
export function bytesToString(buffer: ArrayBuffer | Uint8Array): string {
  return new TextDecoder().decode(buffer);
}

/**
 * Generates a random alphanumeric room / secret ID.
 */
export function generateRandomId(length: number = 16): string {
  const bytes = getRandomBytes(length);
  return bufferToBase64Url(bytes).substring(0, length);
}
