import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createAdapter } from "@/adapters";
import type { RemoteKey, StreamingApp, TVAdapter, TVBrand } from "@/adapters";
import { defaultSettings, loadSettings, loadTVs, saveSettings, saveTVs } from "@/storage/tvStore";
import type { AppSettings, ManualAddInput, PairingPrompt, SavedTV } from "@/types/app";
import { scanPorts } from "@/discovery/portscan";
import { makeId } from "@/utils/id";
import { errorMessage, sleep } from "@/utils/network";
import { normalizeMacAddress, sendWakeOnLan } from "@/utils/wol";

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
  canSendText: boolean;
  canLaunchApps: boolean;
  connecting: boolean;
  statusMessage: string | null;
  pairingPrompt: PairingPrompt | null;
  bootstrapScanRequested: boolean;
  consumeBootstrapScanRequest: () => void;
  cancelPairing: () => void;
  clearStatus: () => void;
  addOrConnectManualTV: (input: ManualAddInput) => Promise<SavedTV | null>;
  connectToSavedTV: (tvId: string) => Promise<SavedTV | null>;
  submitPairingCode: (code: string) => Promise<SavedTV | null>;
  disconnect: () => Promise<void>;
  sendKey: (key: RemoteKey) => Promise<void>;
  sendText: (text: string) => Promise<void>;
  launchStreamingApp: (app: StreamingApp) => Promise<void>;
  wakeTV: (tvId: string) => Promise<boolean>;
  recoverSavedTV: (tvId: string) => Promise<SavedTV | null>;
  renameTV: (tvId: string, name: string) => Promise<void>;
  toggleFavoriteTV: (tvId: string) => Promise<void>;
  setStartupTV: (tvId: string | null) => Promise<void>;
  setTVMac: (tvId: string, mac: string) => Promise<void>;
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

const scoreRecoveryCandidate = (target: SavedTV, candidate: { name: string; model?: string }): number => {
  const targetName = target.name.trim().toLowerCase();
  const targetModel = (target.model ?? "").trim().toLowerCase();
  const candidateName = candidate.name.trim().toLowerCase();
  const candidateModel = (candidate.model ?? "").trim().toLowerCase();

  let score = 0;
  if (targetName && candidateName && (candidateName.includes(targetName) || targetName.includes(candidateName))) {
    score += 3;
  }
  if (targetModel && candidateModel && (candidateModel.includes(targetModel) || targetModel.includes(candidateModel))) {
    score += 4;
  }
  if (targetModel && candidateName && candidateName.includes(targetModel)) {
    score += 2;
  }
  return score;
};

const BRAND_LABEL: Record<TVBrand, string> = {
  roku: "Roku",
  samsung: "Samsung TV",
  lg: "LG TV",
  sony: "Sony Bravia",
  vizio: "Vizio TV",
  androidtv: "Android TV / Google TV",
  firetv: "Fire TV",
  ir: "IR Blaster",
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
        kind: "pin",
        title: "Sony TV PIN",
        message:
          message ??
          "Enter the 4-digit PIN shown on your Sony TV screen.",
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
    return `${prefix} Make sure TV is on. Set up: Settings → Network & Internet → Home Network → IP Control → Authentication → Normal and Pre-Shared Key, then set Pre-Shared Key to 0000. ${raw}`.trim();
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
  if (tv.brand === "ir") {
    return `${prefix} Make sure your phone has an IR blaster and point it at the TV. ${raw}`.trim();
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
  const cancelPairing = useCallback(() => {
    setPendingPairing(null);
    setStatusMessage("Pairing canceled.");
    setConnecting(false);
  }, []);

  const buildSavedTV = useCallback((input: ManualAddInput): SavedTV => {
    return {
      id: makeId(),
      name: input.name || `${input.brand.toUpperCase()} TV`,
      brand: input.brand,
      ip: input.brand === "ir" ? "ir-local" : input.ip,
      psk: input.brand === "ir" ? input.irBrand : (input.psk || undefined),
      irBrand: input.irBrand,
      favorite: false,
      lastSeen: now(),
    };
  }, []);

  const wakeSavedTv = useCallback(
    async (tv: SavedTV): Promise<boolean> => {
      if (tv.brand === "ir") return false;
      if (!tv.mac) return false;
      const normalized = normalizeMacAddress(tv.mac);
      if (!normalized) return false;
      setStatusMessage(`Sending wake packet to ${tv.name}...`);
      const ok = await sendWakeOnLan(normalized);
      if (ok) {
        setStatusMessage(`Wake packet sent to ${tv.name}.`);
      }
      return ok;
    },
    []
  );

  const recoverTvAddress = useCallback(
    async (tv: SavedTV): Promise<SavedTV | null> => {
      if (tv.brand === "ir") return null;
      await wakeSavedTv(tv).catch(() => false);
      setStatusMessage(`Trying smart reconnect for ${tv.name}...`);

      const discovered = await scanPorts(260, 10).catch(() => []);
      const candidates = discovered
        .filter((d) => d.online && d.brand === tv.brand)
        .map((d) => ({ ...d, score: scoreRecoveryCandidate(tv, d) }))
        .sort((a, b) => b.score - a.score);

      if (candidates.length === 0) return null;

      const best = candidates[0];
      if (!best?.ip) return null;
      if (best.ip === tv.ip) return tv;

      const recovered: SavedTV = {
        ...tv,
        ip: best.ip,
        model: tv.model ?? best.model,
        lastSeen: now()
      };

      const nextTVs = upsertTV(tvs, recovered);
      await persistTVs(nextTVs);
      setStatusMessage(`Found ${tv.name} at ${best.ip}. Reconnecting...`);
      return recovered;
    },
    [persistTVs, tvs, wakeSavedTv]
  );

  const connectUsingTV = useCallback(
    async (
      tv: SavedTV,
      mode: "manual" | "saved",
      options?: { allowRecovery?: boolean }
    ): Promise<SavedTV | null> => {
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

          // Show pairing modal only when TV is actively showing a code
          if (adapter.submitCode && result.needsCode !== false) {
            const prompt = pairingPromptFor(tv, result.message);
            setPendingPairing({ tv, adapter, prompt });
            return null;
          }

          await adapter.disconnect();

          if (attempt < 2) {
            setStatusMessage("First attempt failed, retrying connection...");
            await sleep(600);
          } else {
            const allowRecovery =
              mode === "saved" && tv.brand !== "ir" && options?.allowRecovery !== false;
            if (allowRecovery) {
              const recovered = await recoverTvAddress(tv);
              if (recovered && recovered.ip !== tv.ip) {
                return await connectUsingTV(recovered, "saved", { allowRecovery: false });
              }
            }
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
          mac: connectedResult.mac ?? tv.mac,
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
    [persistTVs, recoverTvAddress, settings, tvs]
  );

  const addOrConnectManualTV = useCallback(
    async (input: ManualAddInput): Promise<SavedTV | null> => {
      const matchIp = input.brand === "ir" ? "ir-local" : input.ip.trim().toLowerCase();
      const existing = tvs.find(
        (item) =>
          item.brand === input.brand &&
          item.ip.trim().toLowerCase() === matchIp
      );
      if (existing) {
        const mergedExisting: SavedTV = {
          ...existing,
          name: input.name || existing.name,
          psk: input.brand === "ir" ? input.irBrand : (input.psk || existing.psk),
          irBrand: input.irBrand || existing.irBrand,
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
          mac: result.mac ?? pendingPairing.tv.mac,
          authToken: result.authToken ?? pendingPairing.tv.authToken,
          clientKey: result.clientKey ?? pendingPairing.tv.clientKey ?? pendingPairing.tv.authKey,
          certificate: result.certificate ?? pendingPairing.tv.certificate,
          lastSeen: now(),
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

  const sendText = useCallback(
    async (text: string): Promise<void> => {
      if (!activeAdapter?.sendText) {
        throw new Error("Text input is not supported for this TV brand yet.");
      }
      await activeAdapter.sendText(text);
    },
    [activeAdapter]
  );

  const launchStreamingApp = useCallback(
    async (app: StreamingApp): Promise<void> => {
      if (!activeAdapter?.launchApp) {
        throw new Error("Quick app launch is not supported for this TV brand yet.");
      }
      await activeAdapter.launchApp(app);
    },
    [activeAdapter]
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

  const toggleFavoriteTV = useCallback(
    async (tvId: string): Promise<void> => {
      const next = tvs.map((tv) =>
        tv.id === tvId ? { ...tv, favorite: !tv.favorite } : tv
      );
      await persistTVs(next);
    },
    [persistTVs, tvs]
  );

  const setStartupTV = useCallback(
    async (tvId: string | null): Promise<void> => {
      const nextSettings: AppSettings = {
        ...settings,
        startupTvId: tvId ?? undefined,
        launchTarget: tvId
          ? "startup_tv"
          : settings.launchTarget === "startup_tv"
            ? "home"
            : settings.launchTarget
      };
      setSettings(nextSettings);
      await saveSettings(nextSettings);
    },
    [settings]
  );

  const setTVMac = useCallback(
    async (tvId: string, mac: string): Promise<void> => {
      const normalized = normalizeMacAddress(mac);
      if (!normalized) {
        setStatusMessage("Invalid MAC address format. Example: AA:BB:CC:DD:EE:FF");
        return;
      }
      const next = tvs.map((tv) => (tv.id === tvId ? { ...tv, mac: normalized } : tv));
      await persistTVs(next);
      setStatusMessage("Wake MAC saved.");
    },
    [persistTVs, tvs]
  );

  const wakeTV = useCallback(
    async (tvId: string): Promise<boolean> => {
      const tv = tvs.find((item) => item.id === tvId);
      if (!tv) {
        setStatusMessage("TV entry not found.");
        return false;
      }
      if (!tv.mac) {
        setStatusMessage(`No MAC address saved for ${tv.name}. Add it in Settings first.`);
        return false;
      }
      const ok = await wakeSavedTv(tv);
      if (!ok) {
        setStatusMessage(`Could not send wake packet for ${tv.name}. Check MAC and WiFi.`);
      }
      return ok;
    },
    [tvs, wakeSavedTv]
  );

  const recoverSavedTV = useCallback(
    async (tvId: string): Promise<SavedTV | null> => {
      const tv = tvs.find((item) => item.id === tvId);
      if (!tv) {
        setStatusMessage("TV entry not found.");
        return null;
      }
      const recovered = await recoverTvAddress(tv);
      if (!recovered) {
        setStatusMessage(`Could not auto-recover ${tv.name}. Open Advanced Help for steps.`);
        return null;
      }
      return await connectUsingTV(recovered, "saved", { allowRecovery: false });
    },
    [connectUsingTV, recoverTvAddress, tvs]
  );

  const forgetTV = useCallback(
    async (tvId: string): Promise<void> => {
      const next = tvs.filter((tv) => tv.id !== tvId);
      await persistTVs(next);
      if (activeTvId === tvId) {
        await disconnect();
      }
      if (settings.startupTvId === tvId || settings.lastTvId === tvId) {
        const nextSettings: AppSettings = {
          ...settings,
          startupTvId: settings.startupTvId === tvId ? undefined : settings.startupTvId,
          lastTvId: settings.lastTvId === tvId ? undefined : settings.lastTvId,
          launchTarget:
            settings.launchTarget === "startup_tv" && settings.startupTvId === tvId
              ? "home"
              : settings.launchTarget
        };
        setSettings(nextSettings);
        await saveSettings(nextSettings);
      }
    },
    [activeTvId, disconnect, persistTVs, settings, tvs]
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
  const canSendText = Boolean(activeAdapter?.sendText);
  const canLaunchApps = Boolean(activeAdapter?.launchApp);

  const value = useMemo<TVContextValue>(
    () => ({
      hydrated,
      tvs,
      settings,
      activeTv,
      canSendText,
      canLaunchApps,
      connecting,
      statusMessage,
      pairingPrompt: pendingPairing?.prompt ?? null,
      bootstrapScanRequested,
      consumeBootstrapScanRequest: () => setBootstrapScanRequested(false),
      cancelPairing,
      clearStatus,
      addOrConnectManualTV,
      connectToSavedTV,
      submitPairingCode,
      disconnect,
      sendKey,
      sendText,
      launchStreamingApp,
      wakeTV,
      recoverSavedTV,
      renameTV,
      toggleFavoriteTV,
      setStartupTV,
      setTVMac,
      forgetTV,
      updateSettings
    }),
    [
      hydrated,
      tvs,
      settings,
      activeTv,
      canSendText,
      canLaunchApps,
      connecting,
      statusMessage,
      pendingPairing,
      bootstrapScanRequested,
      cancelPairing,
      clearStatus,
      addOrConnectManualTV,
      connectToSavedTV,
      submitPairingCode,
      disconnect,
      sendKey,
      sendText,
      launchStreamingApp,
      wakeTV,
      recoverSavedTV,
      renameTV,
      toggleFavoriteTV,
      setStartupTV,
      setTVMac,
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
