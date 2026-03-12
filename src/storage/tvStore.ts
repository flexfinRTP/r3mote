import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppSettings, SavedTV } from "@/types/app";

const STORAGE_KEYS = {
  TVS: "r3mote:tvs",
  SETTINGS: "r3mote:settings"
} as const;

export const defaultSettings: AppSettings = {
  hapticFeedback: true,
  darkMode: true,
  buttonSize: "large",
  showNumberPad: false
};

export const loadTVs = async (): Promise<SavedTV[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.TVS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as SavedTV[];
    return Array.isArray(parsed) ? parsed : [];
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
    return {
      ...defaultSettings,
      ...(JSON.parse(raw) as Partial<AppSettings>)
    };
  } catch {
    return defaultSettings;
  }
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};
