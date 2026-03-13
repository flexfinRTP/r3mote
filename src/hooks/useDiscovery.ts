import { useCallback, useRef, useState } from "react";
import { runDiscovery } from "@/discovery/scan";
import type { DiscoveryDevice } from "@/discovery/types";
import { useTVContext } from "@/context/TVContext";

export const useDiscovery = () => {
  const { tvs } = useTVContext();
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<DiscoveryDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastScanSummary, setLastScanSummary] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const deviceMapRef = useRef(new Map<string, DiscoveryDevice>());

  const scan = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLastScanSummary(null);
    setScanProgress(0);
    deviceMapRef.current.clear();
    setDevices([]);

    try {
      const result = await runDiscovery(tvs, {
        timeoutMs: 3000,
        onFound: (device) => {
          const key = `${device.brand}:${device.ip}`;
          if (!deviceMapRef.current.has(key)) {
            deviceMapRef.current.set(key, device);
            setDevices((prev) => {
              const exists = prev.some(
                (d) => d.brand === device.brand && d.ip === device.ip
              );
              if (exists) return prev;
              return [...prev, device];
            });
          }
        },
        onProgress: (scanned, total) => {
          setScanProgress(Math.round((scanned / total) * 100));
        },
      });

      setDevices(result);
      const onlineCount = result.filter((d) => d.online).length;
      const offlineSaved = result.filter((d) => !d.online).length;
      setScanProgress(100);
      setLastScanSummary(
        onlineCount > 0
          ? `Found ${onlineCount} TV${onlineCount === 1 ? "" : "s"} on your network.`
          : `No live TVs found.${offlineSaved > 0 ? ` ${offlineSaved} saved TV${offlineSaved === 1 ? "" : "s"} shown offline.` : " Try Add TV Manually."}`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to discover TVs.";
      setError(message);
      setLastScanSummary("Scan failed. Check WiFi, then try again.");
    } finally {
      setLoading(false);
    }
  }, [tvs]);

  return {
    loading,
    devices,
    error,
    lastScanSummary,
    scanProgress,
    scan,
  };
};
