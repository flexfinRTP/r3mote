export type TVBrand =
  | "roku"
  | "samsung"
  | "lg"
  | "sony"
  | "vizio"
  | "androidtv"
  | "firetv";

export type RemoteKey =
  | "power"
  | "volume_up"
  | "volume_down"
  | "mute"
  | "channel_up"
  | "channel_down"
  | "up"
  | "down"
  | "left"
  | "right"
  | "select"
  | "back"
  | "home"
  | "menu"
  | "guide"
  | "play"
  | "pause"
  | "stop"
  | "rewind"
  | "forward"
  | "input"
  | "num_0"
  | "num_1"
  | "num_2"
  | "num_3"
  | "num_4"
  | "num_5"
  | "num_6"
  | "num_7"
  | "num_8"
  | "num_9";

export interface TVState {
  power: boolean;
  volume?: number;
  muted?: boolean;
  input?: string;
}

export interface AdapterConnectOptions {
  ip: string;
  psk?: string;
  authToken?: string;
  clientKey?: string;
  certificate?: {
    key?: string | null;
    cert?: string | null;
    androidKeyStore?: string;
    certAlias?: string;
    keyAlias?: string;
  };
  onPairingCode?: (codeType: "pin" | "secret", code: string) => void;
  onInfo?: (message: string) => void;
}

export interface AdapterConnectResult {
  ok: boolean;
  message?: string;
  authToken?: string;
  clientKey?: string;
  certificate?: {
    key?: string | null;
    cert?: string | null;
    androidKeyStore?: string;
    certAlias?: string;
    keyAlias?: string;
  };
}

export interface TVAdapter {
  brand: TVBrand;
  connect(options: AdapterConnectOptions): Promise<AdapterConnectResult>;
  submitCode?(code: string): Promise<AdapterConnectResult>;
  disconnect(): Promise<void>;
  sendKey(key: RemoteKey): Promise<void>;
  ping(): Promise<boolean>;
  getState?(): Promise<TVState>;
}
