/**
 * KDROP Memory Zeroization
 * Scrubs sensitive cryptographic byte arrays and strings from RAM.
 */

/**
 * Overwrites a Uint8Array or ArrayBuffer with random bytes, then fills with zeroes.
 */
export function zeroizeBuffer(buffer: Uint8Array | ArrayBuffer | null | undefined): void {
  if (!buffer) return;
  const view = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (typeof window !== "undefined" && window.crypto) {
    try {
      window.crypto.getRandomValues(view);
    } catch {
      // fallback if length is too large
    }
  }
  view.fill(0);
}
