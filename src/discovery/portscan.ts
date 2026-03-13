import * as Network from "expo-network";
import type { TVBrand } from "@/adapters";
import type { DiscoveryDevice } from "./types";

const TcpSocket = require("react-native-tcp-socket");

const fetchWithTimeout = async (
  url: string,
  timeoutMs: number,
  options?: RequestInit
): Promise<Response | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch {
    clearTimeout(timer);
    return null;
  }
};

const tcpProbe = (ip: string, port: number, timeoutMs: number): Promise<boolean> => {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      try {
        client.destroy();
      } catch {}
      resolve(ok);
    };

    const client = TcpSocket.createConnection(
      { host: ip, port, timeout: timeoutMs },
      () => finish(true)
    );
    client.on("error", () => finish(false));
    client.on("timeout", () => finish(false));
    setTimeout(() => finish(false), timeoutMs + 200);
  });
};

interface ProbeHit {
  brand: TVBrand;
  name: string;
  model?: string;
}

const probeRoku = async (ip: string, t: number): Promise<ProbeHit | null> => {
  const res = await fetchWithTimeout(`http://${ip}:8060/`, t);
  if (!res) return null;
  const text = await res.text().catch(() => "");
  if (!text.includes("<") && !text.toLowerCase().includes("roku")) return null;
  const nameMatch = text.match(/<friendlyName>([^<]+)<\/friendlyName>/i);
  const modelMatch = text.match(/<modelName>([^<]+)<\/modelName>/i);
  return {
    brand: "roku",
    name: nameMatch?.[1] || "Roku TV",
    model: modelMatch?.[1] || undefined,
  };
};

const probeSamsung = async (ip: string, t: number): Promise<ProbeHit | null> => {
  const res = await fetchWithTimeout(`http://${ip}:8001/api/v2/`, t);
  if (!res) return null;
  const text = await res.text().catch(() => "");
  try {
    const json = JSON.parse(text);
    if (json.device || json.name || json.id) {
      return {
        brand: "samsung",
        name: json.device?.name || json.name || "Samsung TV",
        model: json.device?.modelName || json.model || undefined,
      };
    }
  } catch {}
  if (text.toLowerCase().includes("samsung")) {
    return { brand: "samsung", name: "Samsung TV" };
  }
  return null;
};

const probeSony = async (ip: string, t: number): Promise<ProbeHit | null> => {
  const res = await fetchWithTimeout(`http://${ip}/sony/system`, t, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Auth-PSK": "0000" },
    body: JSON.stringify({
      id: 1,
      method: "getSystemInformation",
      version: "1.0",
      params: [],
    }),
  });
  if (!res) return null;
  const text = await res.text().catch(() => "");
  if (!text.includes("result") && !text.includes("error") && !text.toLowerCase().includes("sony")) {
    return null;
  }
  try {
    const json = JSON.parse(text);
    const info = json.result?.[0];
    return {
      brand: "sony",
      name: info?.model || info?.name || "Sony Bravia",
      model: info?.model || undefined,
    };
  } catch {}
  return { brand: "sony", name: "Sony Bravia" };
};

const probeLG = async (ip: string, t: number): Promise<ProbeHit | null> => {
  // LG webOS runs a WebSocket server on port 3000/3001 — an HTTP GET returns an error response
  const res = await fetchWithTimeout(`http://${ip}:3000/`, t);
  if (res) return { brand: "lg", name: "LG TV" };
  const res2 = await fetchWithTimeout(`http://${ip}:3001/`, t);
  if (res2) return { brand: "lg", name: "LG TV" };
  return null;
};

const probeTcpBrands = async (ip: string, t: number): Promise<ProbeHit | null> => {
  const [atv, vizio, firetv] = await Promise.all([
    tcpProbe(ip, 6466, t),
    tcpProbe(ip, 7345, t),
    tcpProbe(ip, 5555, t),
  ]);
  if (atv) return { brand: "androidtv", name: "Android TV" };
  if (vizio) return { brand: "vizio", name: "Vizio TV" };
  if (firetv) return { brand: "firetv", name: "Fire TV" };
  return null;
};

type ProbeFunc = (ip: string, timeout: number) => Promise<ProbeHit | null>;

const HTTP_PROBES: ProbeFunc[] = [probeRoku, probeSamsung, probeSony, probeLG];
const TCP_PROBES: ProbeFunc[] = [probeTcpBrands];

export interface PortScanCallbacks {
  onFound?: (device: DiscoveryDevice) => void;
  onProgress?: (scanned: number, total: number) => void;
}

export const getLocalIp = async (): Promise<string | null> => {
  try {
    const ip = await Network.getIpAddressAsync();
    if (ip && ip !== "0.0.0.0" && ip.includes(".")) return ip;
    return null;
  } catch {
    return null;
  }
};

export const scanPorts = async (
  timeoutPerHost = 500,
  concurrency = 30,
  callbacks?: PortScanCallbacks
): Promise<DiscoveryDevice[]> => {
  const localIp = await getLocalIp();
  if (!localIp) return [];

  const parts = localIp.split(".");
  const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
  const localOctet = parseInt(parts[3], 10);

  const ips: string[] = [];
  for (let i = 1; i <= 254; i++) {
    if (i === localOctet) continue;
    ips.push(`${subnet}.${i}`);
  }

  const found = new Map<string, DiscoveryDevice>();
  let scanned = 0;
  const total = ips.length;

  const probeIp = async (ip: string) => {
    const allProbes = [...HTTP_PROBES, ...TCP_PROBES];
    const results = await Promise.all(
      allProbes.map((fn) => fn(ip, timeoutPerHost).catch(() => null))
    );

    for (const hit of results) {
      if (!hit) continue;
      const key = `${hit.brand}:${ip}`;
      if (found.has(key)) continue;
      const device: DiscoveryDevice = {
        id: key,
        brand: hit.brand,
        name: hit.name,
        ip,
        model: hit.model,
        source: "portscan",
        online: true,
        lastSeen: Date.now(),
      };
      found.set(key, device);
      callbacks?.onFound?.(device);
    }

    scanned++;
    callbacks?.onProgress?.(scanned, total);
  };

  // Worker pool with concurrency limit
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, ips.length) }, async () => {
    while (true) {
      const myIdx = idx++;
      if (myIdx >= ips.length) return;
      await probeIp(ips[myIdx]);
    }
  });
  await Promise.all(workers);

  return Array.from(found.values());
};
