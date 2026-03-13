import { withTimeout } from "@/utils/network";
import type {
  AdapterConnectOptions,
  AdapterConnectResult,
  RemoteKey,
  TVAdapter
} from "./types";

type VizioKey = { CODESET: number; CODE: number };

const KEY_MAP: Partial<Record<RemoteKey, VizioKey>> = {
  power: { CODESET: 11, CODE: 0 },
  volume_up: { CODESET: 5, CODE: 1 },
  volume_down: { CODESET: 5, CODE: 0 },
  mute: { CODESET: 5, CODE: 3 },
  channel_up: { CODESET: 8, CODE: 1 },
  channel_down: { CODESET: 8, CODE: 0 },
  up: { CODESET: 3, CODE: 8 },
  down: { CODESET: 3, CODE: 9 },
  left: { CODESET: 3, CODE: 10 },
  right: { CODESET: 3, CODE: 11 },
  select: { CODESET: 3, CODE: 2 },
  back: { CODESET: 4, CODE: 0 },
  home: { CODESET: 4, CODE: 3 },
  menu: { CODESET: 4, CODE: 8 },
  play: { CODESET: 2, CODE: 3 },
  pause: { CODESET: 2, CODE: 2 },
  stop: { CODESET: 2, CODE: 1 },
  rewind: { CODESET: 2, CODE: 0 },
  forward: { CODESET: 2, CODE: 4 },
  input: { CODESET: 7, CODE: 1 },
  num_0: { CODESET: 8, CODE: 18 },
  num_1: { CODESET: 8, CODE: 9 },
  num_2: { CODESET: 8, CODE: 10 },
  num_3: { CODESET: 8, CODE: 11 },
  num_4: { CODESET: 8, CODE: 12 },
  num_5: { CODESET: 8, CODE: 13 },
  num_6: { CODESET: 8, CODE: 14 },
  num_7: { CODESET: 8, CODE: 15 },
  num_8: { CODESET: 8, CODE: 16 },
  num_9: { CODESET: 8, CODE: 17 }
};

type PairStartResponse = {
  ITEM?: {
    PAIRING_REQ_TOKEN?: string;
    NAME?: string;
  };
};

type PairFinishResponse = {
  ITEM?: {
    AUTH_TOKEN?: string;
  };
};

export class VizioAdapter implements TVAdapter {
  brand = "vizio" as const;
  private ip = "";
  private authToken = "";
  private pairToken = "";

  async connect(options: AdapterConnectOptions): Promise<AdapterConnectResult> {
    this.ip = options.ip;
    this.authToken = options.authToken ?? "";

    if (this.authToken) {
      const ok = await this.ping();
      if (ok) {
        return { ok: true, authToken: this.authToken };
      }
    }

    const paired = await this.startPairing();
    if (!paired) {
      return { ok: false, message: "Unable to start Vizio pairing." };
    }

    return {
      ok: false,
      needsCode: true,
      message: "Pairing PIN required. Enter PIN shown on your Vizio TV."
    };
  }

  async submitCode(pin: string): Promise<AdapterConnectResult> {
    if (!this.ip || !this.pairToken) {
      return { ok: false, message: "Pairing has not started." };
    }

    try {
      const res = await withTimeout(
        fetch(`https://${this.ip}:7345/pairing/pair`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            DEVICE_ID: "r3mote-mobile",
            CHALLENGE_TYPE: 1,
            RESPONSE_VALUE: pin,
            PAIRING_REQ_TOKEN: Number(this.pairToken)
          })
        }),
        5000
      );
      if (!res.ok) {
        return {
          ok: false,
          message: "Vizio PIN was not accepted. Confirm the code and try again."
        };
      }
      const json = (await res.json()) as PairFinishResponse;
      const token = json?.ITEM?.AUTH_TOKEN;
      if (!token) {
        return { ok: false, message: "Invalid PIN." };
      }
      this.authToken = token;
      return { ok: true, authToken: token };
    } catch {
      return { ok: false, message: "Vizio pairing failed." };
    }
  }

  async disconnect(): Promise<void> {
    return;
  }

  async sendKey(key: RemoteKey): Promise<void> {
    if (!this.ip || !this.authToken) {
      throw new Error("Vizio TV is not paired.");
    }
    const mapped = KEY_MAP[key];
    if (!mapped) {
      throw new Error(`Vizio key not mapped: ${key}`);
    }

    const res = await withTimeout(
      fetch(`https://${this.ip}:7345/key_command/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          AUTH: this.authToken
        },
        body: JSON.stringify({
          KEYLIST: [
            {
              ...mapped,
              ACTION: "KEYPRESS"
            }
          ]
        })
      }),
      4000
    );
    if (!res.ok) {
      throw new Error("Vizio TV rejected the command. Re-pair the TV and try again.");
    }
  }

  async ping(): Promise<boolean> {
    if (!this.ip) {
      return false;
    }
    try {
      const headers: Record<string, string> = {};
      if (this.authToken) {
        headers.AUTH = this.authToken;
      }
      const res = await withTimeout(
        fetch(`https://${this.ip}:7345/state/device/power_mode`, {
          headers
        }),
        4000
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  private async startPairing(): Promise<boolean> {
    try {
      const res = await withTimeout(
        fetch(`https://${this.ip}:7345/pairing/start`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            DEVICE_NAME: "R3mote",
            DEVICE_ID: "r3mote-mobile",
            DEVICE_TYPE: "MOBILE_APP",
            CHALLENGE_TYPE: 1
          })
        }),
        5000
      );
      if (!res.ok) {
        return false;
      }
      const json = (await res.json()) as PairStartResponse;
      const token = json?.ITEM?.PAIRING_REQ_TOKEN;
      if (!token) {
        return false;
      }
      this.pairToken = String(token);
      return true;
    } catch {
      return false;
    }
  }
}
