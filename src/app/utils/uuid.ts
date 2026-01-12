/**
 * Generate a UUID v4 string with fallbacks for environments
 * where crypto.randomUUID() is not available (e.g., insecure contexts).
 *
 * Priority:
 * 1. crypto.randomUUID() - modern browsers in secure contexts
 * 2. crypto.getRandomValues() - fallback for insecure contexts
 * 3. timestamp + Math.random() - last resort
 */
export function generateUUID(): string {
  // Try native randomUUID first (requires secure context)
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    try {
      return globalThis.crypto.randomUUID();
    } catch {
      // Fall through to next method
    }
  }

  // Fallback using getRandomValues (works in insecure contexts)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);

    // Set version (4) and variant (10xx) bits per RFC 4122
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx

    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32)
    ].join('-');
  }

  // Last resort: timestamp + random (not cryptographically secure)
  const timestamp = Date.now().toString(16).padStart(12, '0');
  const random = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');

  return [
    timestamp.slice(0, 8),
    timestamp.slice(8, 12),
    `4${random().slice(1)}`, // Version 4
    `${(8 + Math.floor(Math.random() * 4)).toString(16)}${random().slice(1)}`, // Variant 10xx
    `${random()}${random()}${random()}`
  ].join('-');
}

