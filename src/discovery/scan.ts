import type { SavedTV } from "@/types/app";
import type { DiscoveryDevice, ScanOptions } from "./types";
import { scanMDNS } from "./mdns";
import { scanPorts } from "./portscan";
import { scanSSDP } from "./ssdp";

const keyFor = (brand: string, ip: string) => `${brand}:${ip}`;

type Settled<T> =
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; reason: unknown };

const settle = async <T>(promise: Promise<T>): Promise<Settled<T>> => {
  try {
    const value = await promise;
    return { status: "fulfilled", value };
  } catch (reason) {
    return { status: "rejected", reason };
  }
};

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

  // Port scan is primary — most reliable, works through any router
  // SSDP + mDNS are supplemental — can discover brand/model details
  const [portResult, ssdp, mdns] = await Promise.all([
    settle(
      scanPorts(timeoutMs > 1000 ? 500 : 400, 30, {
        onFound: (device) => addDevice(device),
        onProgress: options?.onProgress,
      })
    ),
    settle(scanSSDP(timeoutMs)),
    settle(scanMDNS(timeoutMs)),
  ]);

  // Merge SSDP/mDNS results (may provide better names/models)
  const merge = (devices: DiscoveryDevice[]) => {
    for (const d of devices) {
      const key = keyFor(d.brand, d.ip);
      const existing = found.get(key);
      if (existing) {
        // Prefer SSDP/mDNS name/model if port-scan had generic names
        if (
          d.name &&
          d.name !== existing.name &&
          !existing.name.includes(existing.ip)
        ) {
          continue;
        }
        found.set(key, { ...existing, name: d.name || existing.name, model: d.model || existing.model });
      } else {
        found.set(key, d);
        options?.onFound?.(d);
      }
    }
  };

  if (ssdp.status === "fulfilled") merge(ssdp.value);
  if (mdns.status === "fulfilled") merge(mdns.value);

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
