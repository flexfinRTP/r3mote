import type { TVBrand } from "@/adapters/types";

export const sanitizeIp = (input: string): string => input.trim();

export const buildBaseUrl = (
  ip: string,
  protocol: "http" | "https",
  port?: number
): string => {
  if (!port) {
    return `${protocol}://${ip}`;
  }
  return `${protocol}://${ip}:${port}`;
};

export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs = 3000
): Promise<T> => {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), timeoutMs)
    )
  ]);
};

export const sleep = async (ms: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, ms));

export const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : "Unexpected error.";

export const defaultPortForBrand = (brand: TVBrand): number => {
  switch (brand) {
    case "roku":
      return 8060;
    case "samsung":
      return 8001;
    case "lg":
      return 3000;
    case "sony":
      return 80;
    case "vizio":
      return 7345;
    case "androidtv":
      return 6466;
    case "firetv":
      return 5555;
    default:
      return 80;
  }
};
