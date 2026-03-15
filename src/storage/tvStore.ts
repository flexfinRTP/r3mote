import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppSettings, SavedTV } from "@/types/app";
import type { TVBrand } from "@/adapters";

const STORAGE_KEYS = {
  TVS: "r3mote:tvs",
  SETTINGS: "r3mote:settings"
} as const;

export const defaultSettings: AppSettings = {
  hapticFeedback: true,
  darkMode: true,
  buttonSize: "large",
  showNumberPad: false,
  launchTarget: "home"
};

const VALID_BRANDS: TVBrand[] = [
  "roku",
  "samsung",
  "lg",
  "sony",
  "vizio",
  "androidtv",
  "firetv",
  "ir"
];

const VALID_LAUNCH_TARGETS: AppSettings["launchTarget"][] = [
  "home",
  "last",
  "favorite",
  "startup_tv"
];

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const sanitizeTV = (raw: unknown): SavedTV | null => {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const brand = asString(obj.brand) as TVBrand | undefined;
  const id = asString(obj.id);
  const ip = asString(obj.ip);
  const name = asString(obj.name);

  if (!id || !name || !ip || !brand || !VALID_BRANDS.includes(brand)) {
    return null;
  }

  return {
    id,
    name,
    brand,
    ip,
    model: asString(obj.model),
    mac: asString(obj.mac),
    authToken: asString(obj.authToken),
    authKey: asString(obj.authKey),
    clientKey: asString(obj.clientKey),
    psk: asString(obj.psk),
    irBrand: asString(obj.irBrand),
    certificate:
      obj.certificate && typeof obj.certificate === "object"
        ? (obj.certificate as SavedTV["certificate"])
        : undefined,
    lastSeen: asNumber(obj.lastSeen) ?? Date.now(),
    favorite: Boolean(obj.favorite)
  };
};

export const loadTVs = async (): Promise<SavedTV[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.TVS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const sanitized = parsed
      .map((item) => sanitizeTV(item))
      .filter((item): item is SavedTV => Boolean(item));
    return sanitized;
  } catch {
    return [];
  }
};

export const saveTVs = async (tvs: SavedTV[]): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.TVS, JSON.stringify(tvs));
};

export const loadSettings = async (): Promise<AppSettings> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      return defaultSettings;
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const launchTarget = VALID_LAUNCH_TARGETS.includes(
      parsed.launchTarget as AppSettings["launchTarget"]
    )
      ? parsed.launchTarget
      : defaultSettings.launchTarget;

    return {
      ...defaultSettings,
      ...parsed,
      launchTarget
    };
  } catch {
    return defaultSettings;
  }
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};
