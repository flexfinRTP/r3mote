import type { SavedTV } from "@/types/app";
import type { DiscoveryDevice, ScanOptions } from "./types";
import { scanMDNS } from "./mdns";
import { scanSSDP } from "./ssdp";

const keyFor = (brand: string, ip: string) => `${brand}:${ip}`;

export const runDiscovery = async (
  savedTVs: SavedTV[],
  options?: ScanOptions
): Promise<DiscoveryDevice[]> => {
  const timeoutMs = options?.timeoutMs ?? 3000;

  const [ssdp, mdns] = await Promise.allSettled([
    scanSSDP(timeoutMs),
    scanMDNS(timeoutMs)
  ]);

  const found = new Map<string, DiscoveryDevice>();
  const add = (devices: DiscoveryDevice[]) => {
    devices.forEach((device) => {
      found.set(keyFor(device.brand, device.ip), device);
    });
  };

  if (ssdp.status === "fulfilled") add(ssdp.value);
  if (mdns.status === "fulfilled") add(mdns.value);

  for (const tv of savedTVs) {
    const key = keyFor(tv.brand, tv.ip);
    if (found.has(key)) {
      continue;
    }
    found.set(key, {
      id: tv.id,
      brand: tv.brand,
      ip: tv.ip,
      name: tv.name,
      model: tv.model,
      source: "manual",
      online: false,
      lastSeen: tv.lastSeen
    });
  }

  return Array.from(found.values()).sort((a, b) => {
    if (a.online !== b.online) {
      return a.online ? -1 : 1;
    }
    return b.lastSeen - a.lastSeen;
  });
};
