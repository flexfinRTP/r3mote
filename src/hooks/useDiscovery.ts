import { useCallback, useState } from "react";
import { runDiscovery } from "@/discovery/scan";
import type { DiscoveryDevice } from "@/discovery/types";
import { useTVContext } from "@/context/TVContext";

export const useDiscovery = () => {
  const { tvs } = useTVContext();
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<DiscoveryDevice[]>([]);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await runDiscovery(tvs, { timeoutMs: 3000 });
      setDevices(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to discover TVs.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [tvs]);

  return {
    loading,
    devices,
    error,
    scan
  };
};
