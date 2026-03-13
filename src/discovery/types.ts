import type { TVBrand } from "@/adapters";

export interface DiscoveryDevice {
  id: string;
  brand: TVBrand;
  name: string;
  ip: string;
  model?: string;
  source: "ssdp" | "mdns" | "manual" | "portscan";
  online: boolean;
  lastSeen: number;
}

export interface ScanOptions {
  timeoutMs?: number;
  onFound?: (device: DiscoveryDevice) => void;
  onProgress?: (scanned: number, total: number) => void;
}
