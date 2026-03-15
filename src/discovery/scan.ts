import type { SavedTV } from "@/types/app";
import type { DiscoveryDevice, ScanOptions } from "./types";
import { scanPorts } from "./portscan";

const keyFor = (brand: string, ip: string) => `${brand}:${ip}`;

export const runDiscovery = async (
  savedTVs: SavedTV[],
  options?: ScanOptions
): Promise<DiscoveryDevice[]> => {
  const timeoutMs = options?.timeoutMs ?? 3000;

  const found = new Map<string, DiscoveryDevice>();
  const addDevice = (d: DiscoveryDevice) => {
    const key = keyFor(d.brand, d.ip);
    if (!found.has(key)) {
      found.set(key, d);
      options?.onFound?.(d);
    }
  };

  // Port scan with parallel probes per IP for speed.
  // 12 workers × 4 parallel HTTP probes = 48 max concurrent (safe for native bridge).
  // 300ms timeout is plenty for LAN — connection-refused returns in <10ms.
  try {
    await scanPorts(300, 12, {
      onFound: (device) => addDevice(device),
      onProgress: options?.onProgress,
    });
  } catch {
    // Swallow — partial results are still in `found` via onFound callbacks
  }

  // Keep saved TVs visible (offline) so user can still tap to reconnect
  for (const tv of savedTVs) {
    const key = keyFor(tv.brand, tv.ip);
    if (found.has(key)) continue;
    found.set(key, {
      id: tv.id,
      brand: tv.brand,
      ip: tv.ip,
      name: tv.name,
      model: tv.model,
      source: "manual",
      online: false,
      lastSeen: tv.lastSeen,
    });
  }

  return Array.from(found.values()).sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    return b.lastSeen - a.lastSeen;
  });
};
