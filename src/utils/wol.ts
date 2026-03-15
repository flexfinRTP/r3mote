import * as Network from "expo-network";

let cachedUdpModule: any | null | undefined;

const getUdpModule = (): any | null => {
  if (cachedUdpModule !== undefined) {
    return cachedUdpModule;
  }
  try {
    // Dynamically load native UDP to avoid startup crashes when module is missing.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedUdpModule = require("react-native-udp");
  } catch {
    cachedUdpModule = null;
  }
  return cachedUdpModule;
};

export const normalizeMacAddress = (input: string): string | null => {
  const clean = input.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  if (clean.length !== 12) return null;
  return clean.match(/.{1,2}/g)?.join(":") ?? null;
};

const buildMagicPacket = (normalizedMac: string): Uint8Array => {
  const macBytes = normalizedMac.split(":").map((part) => parseInt(part, 16));
  const packet = new Uint8Array(6 + 16 * 6);
  packet.fill(0xff, 0, 6);
  for (let i = 0; i < 16; i += 1) {
    for (let j = 0; j < 6; j += 1) {
      packet[6 + i * 6 + j] = macBytes[j];
    }
  }
  return packet;
};

const getBroadcastAddress = async (): Promise<string> => {
  try {
    const ip = await Network.getIpAddressAsync();
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.255`;
    }
  } catch {
    // Use fallback
  }
  return "255.255.255.255";
};

export const sendWakeOnLan = async (
  mac: string,
  attempts = 3
): Promise<boolean> => {
  const dgram = getUdpModule();
  if (!dgram) return false;

  const normalized = normalizeMacAddress(mac);
  if (!normalized) return false;

  const packet = buildMagicPacket(normalized);
  const address = await getBroadcastAddress();

  return await new Promise<boolean>((resolve) => {
    let sent = 0;
    let finished = false;
    const socket = dgram.createSocket({ type: "udp4", reusePort: false });

    const finish = (ok: boolean) => {
      if (finished) return;
      finished = true;
      try {
        socket.close();
      } catch {
        // no-op
      }
      resolve(ok);
    };

    socket.on("error", () => finish(false));

    socket.bind(0, () => {
      try {
        socket.setBroadcast?.(true);
      } catch {
        // no-op
      }

      for (let i = 0; i < attempts; i += 1) {
        setTimeout(() => {
          try {
            socket.send(packet, 0, packet.length, 9, address);
            sent += 1;
            if (sent >= attempts) {
              // Give network stack a short beat, then resolve success.
              setTimeout(() => finish(true), 80);
            }
          } catch {
            finish(false);
          }
        }, i * 80);
      }
    });

    setTimeout(() => finish(sent > 0), 1200);
  });
};
