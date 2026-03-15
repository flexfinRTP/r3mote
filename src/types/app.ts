import type { TVBrand } from "@/adapters/types";

export interface SavedTV {
  id: string;
  name: string;
  brand: TVBrand;
  ip: string;
  model?: string;
  mac?: string;
  authToken?: string;
  authKey?: string;
  clientKey?: string;
  psk?: string;
  irBrand?: string;
  certificate?: {
    key?: string | null;
    cert?: string | null;
    androidKeyStore?: string;
    certAlias?: string;
    keyAlias?: string;
  };
  lastSeen: number;
  favorite: boolean;
}

export interface AppSettings {
  hapticFeedback: boolean;
  darkMode: boolean;
  buttonSize: "normal" | "large";
  showNumberPad: boolean;
  launchTarget: "home" | "last" | "favorite" | "startup_tv";
  startupTvId?: string;
  lastTvId?: string;
}

export interface ManualAddInput {
  name: string;
  brand: TVBrand;
  ip: string;
  psk?: string;
  irBrand?: string;
}

export interface PairingPrompt {
  kind: "info" | "pin" | "psk" | "secret";
  title: string;
  message: string;
}
