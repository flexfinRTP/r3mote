const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const toUtf8Bytes = (input: string): number[] => {
  if (typeof TextEncoder !== "undefined") {
    return Array.from(new TextEncoder().encode(input));
  }

  // Fallback UTF-8 encoding for older runtimes.
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i += 1) {
    let codePoint = input.charCodeAt(i);

    if (codePoint >= 0xd800 && codePoint <= 0xdbff && i + 1 < input.length) {
      const next = input.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = ((codePoint - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
        i += 1;
      }
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    }
  }
  return bytes;
};

const base64FromBytes = (bytes: number[]): string => {
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const chunk = (b0 << 16) | (b1 << 8) | b2;

    output += BASE64_ALPHABET[(chunk >> 18) & 0x3f];
    output += BASE64_ALPHABET[(chunk >> 12) & 0x3f];
    output += i + 1 < bytes.length ? BASE64_ALPHABET[(chunk >> 6) & 0x3f] : "=";
    output += i + 2 < bytes.length ? BASE64_ALPHABET[chunk & 0x3f] : "=";
  }
  return output;
};

export const encodeBase64 = (input: string): string => {
  if (typeof globalThis.btoa === "function") {
    try {
      return globalThis.btoa(input);
    } catch {
      // Continue to robust fallback below for non-latin data.
    }
  }

  const maybeBuffer = (globalThis as unknown as { Buffer?: { from: (value: string, encoding: string) => { toString: (encoding: string) => string } } }).Buffer;
  if (maybeBuffer?.from) {
    try {
      return maybeBuffer.from(input, "utf8").toString("base64");
    } catch {
      // Fall through to pure JS encoding.
    }
  }

  return base64FromBytes(toUtf8Bytes(input));
};
