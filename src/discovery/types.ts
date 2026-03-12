import type { TVBrand } from "@/adapters";

export interface DiscoveryDevice {
  id: string;
  brand: TVBrand;
  name: string;
  ip: string;
  model?: string;
  source: "ssdp" | "mdns" | "manual";
  online: boolean;
  lastSeen: number;
}

export interface ScanOptions {
  timeoutMs?: number;
}
