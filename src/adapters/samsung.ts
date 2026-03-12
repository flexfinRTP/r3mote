import type {
  AdapterConnectOptions,
  AdapterConnectResult,
  RemoteKey,
  TVAdapter
} from "./types";

const KEY_MAP: Record<RemoteKey, string> = {
  power: "KEY_POWER",
  volume_up: "KEY_VOLUP",
  volume_down: "KEY_VOLDOWN",
  mute: "KEY_MUTE",
  channel_up: "KEY_CHUP",
  channel_down: "KEY_CHDOWN",
  up: "KEY_UP",
  down: "KEY_DOWN",
  left: "KEY_LEFT",
  right: "KEY_RIGHT",
  select: "KEY_ENTER",
  back: "KEY_RETURN",
  home: "KEY_HOME",
  menu: "KEY_MENU",
  guide: "KEY_GUIDE",
  play: "KEY_PLAY",
  pause: "KEY_PAUSE",
  stop: "KEY_STOP",
  rewind: "KEY_REWIND",
  forward: "KEY_FF",
  input: "KEY_SOURCE",
  num_0: "KEY_0",
  num_1: "KEY_1",
  num_2: "KEY_2",
  num_3: "KEY_3",
  num_4: "KEY_4",
  num_5: "KEY_5",
  num_6: "KEY_6",
  num_7: "KEY_7",
  num_8: "KEY_8",
  num_9: "KEY_9"
};

const b64 = (s: string): string => {
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(s);
  }
  return s;
};

type SamsungMessage = {
  event?: string;
  data?: {
    token?: string;
  };
};

export class SamsungAdapter implements TVAdapter {
  brand = "samsung" as const;
  private ip = "";
  private token = "";
  private socket: WebSocket | null = null;

  async connect(options: AdapterConnectOptions): Promise<AdapterConnectResult> {
    this.ip = options.ip;
    this.token = options.authToken ?? "";

    const name = b64("R3mote");
    const secureUrl = this.buildUrl(8002, true, name, this.token);
    const insecureUrl = this.buildUrl(8001, false, name, this.token);

    const secureResult = await this.openSocket(secureUrl);
    if (secureResult.ok) {
      return secureResult;
    }

    const fallbackResult = await this.openSocket(insecureUrl);
    if (fallbackResult.ok) {
      return fallbackResult;
    }

    return {
      ok: false,
      message:
        secureResult.message ??
        fallbackResult.message ??
        "Samsung TV connection failed."
    };
  }

  async disconnect(): Promise<void> {
    this.socket?.close();
    this.socket = null;
  }

  async sendKey(key: RemoteKey): Promise<void> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Samsung TV not connected.");
    }

    const payload = {
      method: "ms.remote.control",
      params: {
        Cmd: "Click",
        DataOfCmd: KEY_MAP[key],
        Option: "false",
        TypeOfRemote: "SendRemoteKey"
      }
    };

    this.socket.send(JSON.stringify(payload));
  }

  async ping(): Promise<boolean> {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private buildUrl(
    port: number,
    secure: boolean,
    appName: string,
    token?: string
  ): string {
    const protocol = secure ? "wss" : "ws";
    const base = `${protocol}://${this.ip}:${port}/api/v2/channels/samsung.remote.control?name=${appName}`;
    if (!token) {
      return base;
    }
    return `${base}&token=${encodeURIComponent(token)}`;
  }

  private async openSocket(url: string): Promise<AdapterConnectResult> {
    return await new Promise<AdapterConnectResult>((resolve) => {
      let settled = false;
      const socket = new WebSocket(url);
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          socket.close();
          resolve({
            ok: false,
            message:
              "Timed out waiting for Samsung TV. Make sure TV is on and tap Allow on the TV prompt."
          });
        }
      }, 5000);

      socket.onopen = () => {
        this.socket = socket;
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as SamsungMessage;
          const token = msg?.data?.token;
          if (token) {
            this.token = token;
          }
          if (!settled && msg?.event === "ms.channel.connect") {
            settled = true;
            clearTimeout(timeout);
            resolve({
              ok: true,
              authToken: this.token || undefined
            });
          }
        } catch {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            resolve({ ok: true, authToken: this.token || undefined });
          }
        }
      };

      socket.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve({
            ok: false,
            message:
              "Samsung connection failed. Ensure phone/TV are on same WiFi and approve the TV prompt."
          });
        }
      };

      socket.onclose = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve({
            ok: false,
            message:
              "Samsung socket closed before pairing completed. Re-open TV and try again."
          });
        }
      };
    });
  }
}
