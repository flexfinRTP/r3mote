import Zeroconf from "react-native-zeroconf";
import type { DiscoveryDevice } from "./types";

const SERVICES = [
  { type: "_androidtvremote2", protocol: "_tcp", brand: "androidtv" as const },
  { type: "_adb", protocol: "_tcp", brand: "firetv" as const }
];

export const scanMDNS = async (timeoutMs = 3000): Promise<DiscoveryDevice[]> => {
  const zeroconf = new Zeroconf();
  const devices = new Map<string, DiscoveryDevice>();

  return await new Promise<DiscoveryDevice[]>((resolve) => {
    const onResolved = (service: any) => {
      const type = String(service?.type ?? "");
      const ipv4 = Array.isArray(service?.addresses)
        ? service.addresses.find((a: string) => a.includes("."))
        : null;
      const ip = ipv4 || service?.host;
      if (!ip) return;

      const brand = type.includes("_adb") ? "firetv" : "androidtv";
      const name =
        service?.name ||
        (brand === "firetv" ? "Fire TV Device" : "Android TV Device");
      const model = service?.fullname || service?.host || name;

      devices.set(`${brand}:${ip}`, {
        id: `${brand}:${ip}`,
        brand,
        name,
        ip,
        model,
        source: "mdns",
        online: true,
        lastSeen: Date.now()
      });
    };

    zeroconf.on("resolved", onResolved);

    for (const service of SERVICES) {
      zeroconf.scan(service.type, service.protocol, "local.");
    }

    setTimeout(() => {
      zeroconf.stop();
      zeroconf.removeDeviceListeners();
      resolve(Array.from(devices.values()));
    }, timeoutMs);
  });
};
