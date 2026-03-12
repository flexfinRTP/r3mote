import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createAdapter } from "@/adapters";
import type { RemoteKey, TVAdapter, TVBrand } from "@/adapters";
import { defaultSettings, loadSettings, loadTVs, saveSettings, saveTVs } from "@/storage/tvStore";
import type { AppSettings, ManualAddInput, PairingPrompt, SavedTV } from "@/types/app";
import { makeId } from "@/utils/id";
import { errorMessage, sleep } from "@/utils/network";

type PendingPairing = {
  tv: SavedTV;
  adapter: TVAdapter;
  prompt: PairingPrompt;
};

type TVContextValue = {
  hydrated: boolean;
  tvs: SavedTV[];
  settings: AppSettings;
  activeTv: SavedTV | null;
  connecting: boolean;
  statusMessage: string | null;
  pairingPrompt: PairingPrompt | null;
  bootstrapScanRequested: boolean;
  consumeBootstrapScanRequest: () => void;
  clearStatus: () => void;
  addOrConnectManualTV: (input: ManualAddInput) => Promise<SavedTV | null>;
  connectToSavedTV: (tvId: string) => Promise<SavedTV | null>;
  submitPairingCode: (code: string) => Promise<SavedTV | null>;
  disconnect: () => Promise<void>;
  sendKey: (key: RemoteKey) => Promise<void>;
  renameTV: (tvId: string, name: string) => Promise<void>;
  forgetTV: (tvId: string) => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
};

const TVContext = createContext<TVContextValue | null>(null);

const now = () => Date.now();

const upsertTV = (prev: SavedTV[], next: SavedTV): SavedTV[] => {
  const idx = prev.findIndex((tv) => tv.id === next.id);
  if (idx < 0) return [next, ...prev];
  const copy = [...prev];
  copy[idx] = next;
  return copy;
};

const BRAND_LABEL: Record<TVBrand, string> = {
  roku: "Roku",
  samsung: "Samsung TV",
  lg: "LG TV",
  sony: "Sony Bravia",
  vizio: "Vizio TV",
  androidtv: "Android TV / Google TV",
  firetv: "Fire TV"
};

const pairingPromptFor = (tv: SavedTV, message?: string): PairingPrompt => {
  switch (tv.brand) {
    case "vizio":
      return {
        kind: "pin",
        title: "Enter Vizio PIN",
        message:
          message ??
          "A 4-digit PIN should be visible on your Vizio screen. Enter that PIN to finish pairing."
      };
    case "androidtv":
      return {
        kind: "secret",
        title: "Enter Android TV Code",
        message:
          message ??
          "Enter the 6-digit code shown on your Android TV / Google TV screen."
      };
    case "firetv":
      return {
        kind: "secret",
        title: "Enter Fire TV Pairing Code",
        message:
          message ??
          "Keep Fire TV awake, then enter the on-screen pairing code. If missing, enable ADB Debugging first."
      };
    case "samsung":
      return {
        kind: "info",
        title: "Approve on Samsung TV",
        message:
          message ??
          "Look at your Samsung TV and press Allow for R3mote, then try Connect again."
      };
    case "lg":
      return {
        kind: "info",
        title: "Approve on LG TV",
        message:
          message ??
          "Look at your LG TV and press Accept for R3mote, then try Connect again."
      };
    case "sony":
      return {
        kind: "psk",
        title: "Sony Pre-Shared Key",
        message:
          message ??
          "Set IP Control on Sony TV, then enter the exact Pre-Shared Key in manual connect."
      };
    default:
      return {
        kind: "pin",
        title: "Pairing Required",
        message: message ?? "Complete TV pairing and retry."
      };
  }
};

const connectFailureFor = (tv: SavedTV, message?: string): string => {
  const prefix = `${BRAND_LABEL[tv.brand]} connection failed.`;
  const raw = message ?? "";

  if (tv.brand === "sony") {
    return `${prefix} Confirm TV IP Control is enabled and Pre-Shared Key is correct. ${raw}`.trim();
  }
  if (tv.brand === "samsung") {
    return `${prefix} Ensure both devices are on same WiFi and approve the TV prompt. ${raw}`.trim();
  }
  if (tv.brand === "lg") {
    return `${prefix} Enable LG Connect Apps and accept the TV prompt. ${raw}`.trim();
  }
  if (tv.brand === "vizio") {
    return `${prefix} Start pairing again and enter the PIN before it expires. ${raw}`.trim();
  }
  if (tv.brand === "androidtv") {
    return `${prefix} Keep TV awake and enter the 6-digit on-screen code. ${raw}`.trim();
  }
  if (tv.brand === "firetv") {
    return `${prefix} Enable ADB Debugging and keep Fire TV awake during pairing. ${raw}`.trim();
  }
  return raw ? `${prefix} ${raw}` : prefix;
};

const commandFailureFor = (tv: SavedTV | null, message: string): string => {
  if (!tv) {
    return message || "Failed to send command.";
  }
  return `${BRAND_LABEL[tv.brand]} did not accept that command. ${message}`.trim();
};

export const TVProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hydrated, setHydrated] = useState(false);
  const [tvs, setTVs] = useState<SavedTV[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [activeTvId, setActiveTvId] = useState<string | null>(null);
  const [activeAdapter, setActiveAdapter] = useState<TVAdapter | null>(null);
  const [pendingPairing, setPendingPairing] = useState<PendingPairing | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [bootstrapScanRequested, setBootstrapScanRequested] = useState(false);

  useEffect(() => {
    const run = async () => {
      const [loadedTVs, loadedSettings] = await Promise.all([
        loadTVs(),
        loadSettings()
      ]);
      setTVs(loadedTVs);
      setSettings(loadedSettings);
      if (loadedSettings.lastTvId) {
        setActiveTvId(loadedSettings.lastTvId);
      }
      setHydrated(true);
      setBootstrapScanRequested(true);
    };
    run();
  }, []);

  const persistTVs = useCallback(async (next: SavedTV[]) => {
    setTVs(next);
    await saveTVs(next);
  }, []);

  const clearStatus = useCallback(() => setStatusMessage(null), []);

  const buildSavedTV = useCallback((input: ManualAddInput): SavedTV => {
    return {
      id: makeId(),
      name: input.name || `${input.brand.toUpperCase()} TV`,
      brand: input.brand,
      ip: input.ip,
      psk: input.psk,
      favorite: false,
      lastSeen: now()
    };
  }, []);

  const connectUsingTV = useCallback(
    async (tv: SavedTV, mode: "manual" | "saved"): Promise<SavedTV | null> => {
      setConnecting(true);
      setStatusMessage(null);
      try {
        let connectedAdapter: TVAdapter | null = null;
        let connectedResult: Awaited<ReturnType<TVAdapter["connect"]>> | null = null;

        for (let attempt = 1; attempt <= 2; attempt += 1) {
          const adapter = createAdapter(tv.brand);
          const result = await adapter.connect({
            ip: tv.ip,
            psk: tv.psk,
            authToken: tv.authToken,
            clientKey: tv.clientKey,
            certificate: tv.certificate,
            onInfo: (msg) => setStatusMessage(msg)
          });

          if (result.ok) {
            connectedAdapter = adapter;
            connectedResult = result;
            break;
          }

          if (adapter.submitCode) {
            const prompt = pairingPromptFor(tv, result.message);
            setPendingPairing({ tv, adapter, prompt });
            return null;
          }

          await adapter.disconnect();

          if (attempt < 2) {
            setStatusMessage("First attempt failed, retrying connection...");
            await sleep(600);
          } else {
            setStatusMessage(connectFailureFor(tv, result.message));
            return null;
          }
        }

        if (!connectedAdapter || !connectedResult) {
          setStatusMessage(connectFailureFor(tv));
          return null;
        }

        const merged: SavedTV = {
          ...tv,
          authToken: connectedResult.authToken ?? tv.authToken,
          clientKey: connectedResult.clientKey ?? tv.clientKey,
          certificate: connectedResult.certificate ?? tv.certificate,
          lastSeen: now()
        };

        const nextTVs = upsertTV(tvs, merged);
        await persistTVs(nextTVs);

        setActiveAdapter(connectedAdapter);
        setActiveTvId(merged.id);
        const nextSettings = { ...settings, lastTvId: merged.id };
        setSettings(nextSettings);
        await saveSettings(nextSettings);
        setPendingPairing(null);
        setStatusMessage(`Connected to ${merged.name}.`);
        return merged;
      } catch (err) {
        setStatusMessage(connectFailureFor(tv, errorMessage(err)));
        return null;
      } finally {
        setConnecting(false);
      }
    },
    [persistTVs, settings, tvs]
  );

  const addOrConnectManualTV = useCallback(
    async (input: ManualAddInput): Promise<SavedTV | null> => {
      const existing = tvs.find(
        (item) =>
          item.brand === input.brand &&
          item.ip.trim().toLowerCase() === input.ip.trim().toLowerCase()
      );
      if (existing) {
        const mergedExisting: SavedTV = {
          ...existing,
          name: input.name || existing.name,
          psk: input.psk || existing.psk
        };
        return await connectUsingTV(mergedExisting, "saved");
      }
      const tv = buildSavedTV(input);
      return await connectUsingTV(tv, "manual");
    },
    [buildSavedTV, connectUsingTV, tvs]
  );

  const connectToSavedTV = useCallback(
    async (tvId: string): Promise<SavedTV | null> => {
      const tv = tvs.find((item) => item.id === tvId);
      if (!tv) {
        setStatusMessage("TV entry not found.");
        return null;
      }
      return await connectUsingTV(tv, "saved");
    },
    [connectUsingTV, tvs]
  );

  const submitPairingCode = useCallback(
    async (code: string): Promise<SavedTV | null> => {
      if (!pendingPairing) {
        setStatusMessage("No active pairing request.");
        return null;
      }
      if (!pendingPairing.adapter.submitCode) {
        setStatusMessage("This TV does not support code submission.");
        return null;
      }
      setConnecting(true);
      try {
        const result = await pendingPairing.adapter.submitCode(code.trim());
        if (!result.ok) {
          setStatusMessage(connectFailureFor(pendingPairing.tv, result.message ?? "Pairing failed."));
          return null;
        }

        const merged: SavedTV = {
          ...pendingPairing.tv,
          authToken: result.authToken ?? pendingPairing.tv.authToken,
          clientKey: result.clientKey ?? pendingPairing.tv.clientKey,
          certificate: result.certificate ?? pendingPairing.tv.certificate,
          lastSeen: now()
        };
        const next = upsertTV(tvs, merged);
        await persistTVs(next);
        setActiveAdapter(pendingPairing.adapter);
        setActiveTvId(merged.id);
        setPendingPairing(null);
        setStatusMessage(`Pairing successful with ${merged.name}.`);
        return merged;
      } catch (err) {
        setStatusMessage(connectFailureFor(pendingPairing.tv, errorMessage(err)));
        return null;
      } finally {
        setConnecting(false);
      }
    },
    [pendingPairing, persistTVs, tvs]
  );

  const sendKey = useCallback(
    async (key: RemoteKey): Promise<void> => {
      if (!activeAdapter) {
        throw new Error("No connected TV.");
      }
      const tv = tvs.find((item) => item.id === activeTvId) ?? null;
      let lastErr: unknown;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          await activeAdapter.sendKey(key);
          return;
        } catch (err) {
          lastErr = err;
          if (attempt < 2) {
            await sleep(120);
          }
        }
      }
      throw new Error(commandFailureFor(tv, errorMessage(lastErr)));
    },
    [activeAdapter, activeTvId, tvs]
  );

  const disconnect = useCallback(async (): Promise<void> => {
    await activeAdapter?.disconnect();
    setActiveAdapter(null);
    setActiveTvId(null);
  }, [activeAdapter]);

  const renameTV = useCallback(
    async (tvId: string, name: string): Promise<void> => {
      const next = tvs.map((tv) => (tv.id === tvId ? { ...tv, name } : tv));
      await persistTVs(next);
    },
    [persistTVs, tvs]
  );

  const forgetTV = useCallback(
    async (tvId: string): Promise<void> => {
      const next = tvs.filter((tv) => tv.id !== tvId);
      await persistTVs(next);
      if (activeTvId === tvId) {
        await disconnect();
      }
    },
    [activeTvId, disconnect, persistTVs, tvs]
  );

  const updateSettings = useCallback(
    async (partial: Partial<AppSettings>) => {
      const next = {
        ...settings,
        ...partial
      };
      setSettings(next);
      await saveSettings(next);
    },
    [settings]
  );

  const activeTv = useMemo(
    () => tvs.find((tv) => tv.id === activeTvId) ?? null,
    [activeTvId, tvs]
  );

  const value = useMemo<TVContextValue>(
    () => ({
      hydrated,
      tvs,
      settings,
      activeTv,
      connecting,
      statusMessage,
      pairingPrompt: pendingPairing?.prompt ?? null,
      bootstrapScanRequested,
      consumeBootstrapScanRequest: () => setBootstrapScanRequested(false),
      clearStatus,
      addOrConnectManualTV,
      connectToSavedTV,
      submitPairingCode,
      disconnect,
      sendKey,
      renameTV,
      forgetTV,
      updateSettings
    }),
    [
      hydrated,
      tvs,
      settings,
      activeTv,
      connecting,
      statusMessage,
      pendingPairing,
      bootstrapScanRequested,
      clearStatus,
      addOrConnectManualTV,
      connectToSavedTV,
      submitPairingCode,
      disconnect,
      sendKey,
      renameTV,
      forgetTV,
      updateSettings
    ]
  );

  return <TVContext.Provider value={value}>{children}</TVContext.Provider>;
};

export const useTVContext = (): TVContextValue => {
  const ctx = useContext(TVContext);
  if (!ctx) {
    throw new Error("useTVContext must be used inside TVProvider.");
  }
  return ctx;
};
