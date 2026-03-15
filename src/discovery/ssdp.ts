import { makeId } from "@/utils/id";
import type { TVBrand } from "@/adapters";
import type { DiscoveryDevice } from "./types";

let cachedUdpModule: any | null | undefined;

const getUdpModule = (): any | null => {
  if (cachedUdpModule !== undefined) {
    return cachedUdpModule;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedUdpModule = require("react-native-udp");
  } catch {
    cachedUdpModule = null;
  }
  return cachedUdpModule;
};

const SSDP_ADDRESS = "239.255.255.250";
const SSDP_PORT = 1900;

const TARGETS: Array<{ st: string; brand: TVBrand }> = [
  { st: "roku:ecp", brand: "roku" },
  { st: "urn:samsung.com:device:RemoteControlReceiver:1", brand: "samsung" },
  { st: "urn:schemas-upnp-org:device:MediaRenderer:1", brand: "lg" },
  { st: "urn:schemas-sony-com:service:IRCC:1", brand: "sony" },
  { st: "urn:dial-multiscreen-org:device:dial:1", brand: "vizio" },
  { st: "ssdp:all", brand: "roku" }
];

const parseHeaders = (raw: string): Record<string, string> => {
  const lines = raw.split(/\r?\n/);
  const headers: Record<string, string> = {};
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx <= 0) {
      continue;
    }
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    headers[key] = value;
  }
  return headers;
};

const decodeUdpMessage = (msg: unknown): string => {
  if (typeof msg === "string") {
    return msg;
  }
  try {
    if (msg instanceof Uint8Array) {
      return new TextDecoder().decode(msg);
    }
  } catch {
    // ignore and fallback
  }
  try {
    const maybeBuffer = msg as { buffer?: ArrayBuffer };
    if (maybeBuffer?.buffer) {
      return new TextDecoder().decode(new Uint8Array(maybeBuffer.buffer));
    }
  } catch {
    // ignore and fallback
  }
  return String(msg ?? "");
};

const encodeUdpMessage = (text: string): Uint8Array => {
  try {
    return new TextEncoder().encode(text);
  } catch {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i += 1) {
      bytes[i] = text.charCodeAt(i) & 0xff;
    }
    return bytes;
  }
};

const inferBrand = (headers: Record<string, string>): TVBrand | null => {
  const st = (headers.st || "").toLowerCase();
  const usn = (headers.usn || "").toLowerCase();
  const server = (headers.server || "").toLowerCase();
  const location = (headers.location || "").toLowerCase();

  if (st.includes("roku:ecp") || usn.includes("roku")) return "roku";
  if (st.includes("samsung") || server.includes("samsung")) return "samsung";
  if (location.includes("webos") || usn.includes("lge") || server.includes("webos")) {
    return "lg";
  }
  if (st.includes("sony") || usn.includes("sony")) return "sony";
  if (usn.includes("vizio") || server.includes("vizio")) return "vizio";
  return null;
};

const extractIp = (location: string): string | null => {
  if (!location) return null;
  try {
    const url = new URL(location);
    return url.hostname;
  } catch {
    return null;
  }
};

export const scanSSDP = async (timeoutMs = 3000): Promise<DiscoveryDevice[]> => {
  const dgram = getUdpModule();
  if (!dgram) return [];

  return await new Promise<DiscoveryDevice[]>((resolve) => {
    const socket = dgram.createSocket({ type: "udp4", reusePort: true });
    const devices = new Map<string, DiscoveryDevice>();
    let hadSocketError = false;

    socket.on("message", (msg: any, rinfo: { address: string }) => {
      const text = decodeUdpMessage(msg);
      if (!text.includes("HTTP/1.1")) {
        return;
      }
      const headers = parseHeaders(text);
      const brand = inferBrand(headers);
      if (!brand) return;
      const ip = extractIp(headers.location) ?? rinfo.address;
      if (!ip) return;

      const model = headers.server || headers.usn || brand.toUpperCase();
      const name = model.split("/")[0] || `${brand.toUpperCase()} TV`;
      devices.set(`${brand}:${ip}`, {
        id: `${brand}:${ip}`,
        brand,
        name,
        ip,
        model,
        source: "ssdp",
        online: true,
        lastSeen: Date.now()
      });
    });

    socket.on("error", () => {
      hadSocketError = true;
    });

    socket.bind(0, () => {
      for (const target of TARGETS) {
        const packet =
          "M-SEARCH * HTTP/1.1\r\n" +
          `HOST: ${SSDP_ADDRESS}:${SSDP_PORT}\r\n` +
          'MAN: "ssdp:discover"\r\n' +
          "MX: 1\r\n" +
          `ST: ${target.st}\r\n\r\n`;
        const payload = encodeUdpMessage(packet);
        try {
          socket.send(payload, 0, payload.length, SSDP_PORT, SSDP_ADDRESS);
        } catch {
          hadSocketError = true;
        }
      }
    });

    setTimeout(() => {
      try {
        socket.close();
      } catch {
        // no-op
      }
      const result = Array.from(devices.values()).map((d) => ({
        ...d,
        id: d.id || makeId()
      }));
      if (hadSocketError) {
        // Keep returning best effort results even when multicast is restricted.
      }
      resolve(result);
    }, timeoutMs);
  });
};
