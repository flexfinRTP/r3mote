import type {
  AdapterConnectOptions,
  AdapterConnectResult,
  RemoteKey,
  TVAdapter
} from "./types";

type LgControl =
  | { type: "uri"; uri: string; payload?: Record<string, unknown> }
  | { type: "pointer"; button: string };

const KEY_MAP: Partial<Record<RemoteKey, LgControl>> = {
  power: { type: "uri", uri: "ssap://system/turnOff" },
  volume_up: { type: "uri", uri: "ssap://audio/volumeUp" },
  volume_down: { type: "uri", uri: "ssap://audio/volumeDown" },
  mute: { type: "uri", uri: "ssap://audio/setMute", payload: { mute: true } },
  channel_up: { type: "uri", uri: "ssap://tv/channelUp" },
  channel_down: { type: "uri", uri: "ssap://tv/channelDown" },
  up: { type: "pointer", button: "UP" },
  down: { type: "pointer", button: "DOWN" },
  left: { type: "pointer", button: "LEFT" },
  right: { type: "pointer", button: "RIGHT" },
  select: { type: "pointer", button: "ENTER" },
  back: { type: "pointer", button: "BACK" },
  home: { type: "pointer", button: "HOME" },
  menu: { type: "pointer", button: "MENU" },
  guide: { type: "pointer", button: "GUIDE" },
  play: { type: "uri", uri: "ssap://media.controls/play" },
  pause: { type: "uri", uri: "ssap://media.controls/pause" },
  stop: { type: "uri", uri: "ssap://media.controls/stop" },
  rewind: { type: "uri", uri: "ssap://media.controls/rewind" },
  forward: { type: "uri", uri: "ssap://media.controls/fastForward" },
  input: { type: "uri", uri: "ssap://tv/switchInput" },
  num_0: { type: "pointer", button: "0" },
  num_1: { type: "pointer", button: "1" },
  num_2: { type: "pointer", button: "2" },
  num_3: { type: "pointer", button: "3" },
  num_4: { type: "pointer", button: "4" },
  num_5: { type: "pointer", button: "5" },
  num_6: { type: "pointer", button: "6" },
  num_7: { type: "pointer", button: "7" },
  num_8: { type: "pointer", button: "8" },
  num_9: { type: "pointer", button: "9" }
};

type LgMessage = {
  type?: string;
  id?: string;
  payload?: {
    "client-key"?: string;
    socketPath?: string;
  };
};

export class LGAdapter implements TVAdapter {
  brand = "lg" as const;
  private ip = "";
  private clientKey = "";
  private socket: WebSocket | null = null;
  private pointerSocket: WebSocket | null = null;
  private reqId = 1;

  async connect(options: AdapterConnectOptions): Promise<AdapterConnectResult> {
    this.ip = options.ip;
    this.clientKey = options.clientKey ?? "";

    const res = await this.openMainSocket();
    if (!res.ok) {
      return res;
    }
    try {
      await this.setupPointerSocket();
    } catch (err) {
      return {
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : "LG pointer input setup failed. Re-open the app and accept TV prompt."
      };
    }
    return { ok: true, clientKey: this.clientKey || undefined };
  }

  async disconnect(): Promise<void> {
    this.pointerSocket?.close();
    this.socket?.close();
    this.pointerSocket = null;
    this.socket = null;
  }

  async sendKey(key: RemoteKey): Promise<void> {
    const mapping = KEY_MAP[key];
    if (!mapping) {
      throw new Error(`LG key not mapped: ${key}`);
    }

    if (mapping.type === "uri") {
      this.sendRequest(mapping.uri, mapping.payload);
      return;
    }

    if (!this.pointerSocket || this.pointerSocket.readyState !== WebSocket.OPEN) {
      await this.setupPointerSocket();
    }

    if (!this.pointerSocket || this.pointerSocket.readyState !== WebSocket.OPEN) {
      throw new Error("LG pointer socket not ready.");
    }

    this.pointerSocket.send(`type:button\nname:${mapping.button}\n\n`);
  }

  async ping(): Promise<boolean> {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private async openMainSocket(): Promise<AdapterConnectResult> {
    return await new Promise<AdapterConnectResult>((resolve) => {
      let settled = false;
      const socket = new WebSocket(`ws://${this.ip}:3000`);
      const timeout = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        socket.close();
        resolve({ ok: false, message: "Timed out connecting to LG TV." });
      }, 5000);

      socket.onopen = () => {
        this.socket = socket;
        const registerPayload = {
          type: "register",
          id: String(this.reqId++),
          payload: {
            "force-pairing": false,
            "pairingType": "PROMPT",
            "client-key": this.clientKey || undefined,
            manifest: {
              appVersion: "1.0.0",
              signed: {
                appId: "com.family.r3mote",
                created: "2026-03-12",
                localizedAppNames: {
                  "": "R3mote"
                },
                localizedVendorNames: {
                  "": "Family"
                },
                permissions: [
                  "LAUNCH",
                  "LAUNCH_WEBAPP",
                  "APP_TO_APP",
                  "CONTROL_AUDIO",
                  "CONTROL_DISPLAY",
                  "CONTROL_INPUT_TV",
                  "CONTROL_POWER"
                ],
                serial: "r3mote"
              },
              permissions: [
                "CONTROL_AUDIO",
                "CONTROL_DISPLAY",
                "CONTROL_INPUT_TV",
                "CONTROL_POWER"
              ]
            }
          }
        };
        socket.send(JSON.stringify(registerPayload));
      };

      socket.onmessage = (event) => {
        const msg = JSON.parse(String(event.data)) as LgMessage;
        if (msg.type === "registered") {
          const key = msg?.payload?.["client-key"];
          if (key) {
            this.clientKey = key;
          }
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            resolve({ ok: true, clientKey: this.clientKey || undefined });
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
              "LG connection failed. Enable LG Connect Apps on TV and accept the connection prompt."
          });
        }
      };

      socket.onclose = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve({
            ok: false,
            message: "LG TV closed the connection before pairing completed."
          });
        }
      };
    });
  }

  private sendRequest(uri: string, payload?: Record<string, unknown>): string {
    const id = String(this.reqId++);
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("LG TV is not connected.");
    }
    this.socket.send(
      JSON.stringify({
        type: "request",
        id,
        uri,
        payload
      })
    );
    return id;
  }

  private async setupPointerSocket(): Promise<void> {
    if (this.pointerSocket && this.pointerSocket.readyState === WebSocket.OPEN) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("LG pointer setup timed out. Try reconnecting.")),
        5000
      );
      const requestId = this.sendRequest(
        "ssap://com.webos.service.networkinput/getPointerInputSocket"
      );
      const listener = (event: MessageEvent<string>) => {
        let completed = false;
        try {
          const msg = JSON.parse(String(event.data)) as LgMessage;
          if (msg.id !== requestId) {
            return;
          }
          completed = true;
          const socketPath = msg?.payload?.socketPath;
          if (!socketPath) {
            reject(new Error("LG pointer socket path not returned."));
            return;
          }
          const pointer = new WebSocket(socketPath);
          pointer.onopen = () => {
            this.pointerSocket = pointer;
            clearTimeout(timeout);
            resolve();
          };
          pointer.onerror = () => {
            clearTimeout(timeout);
            reject(new Error("LG pointer socket failed."));
          };
        } catch (err) {
          clearTimeout(timeout);
          completed = true;
          reject(err);
        } finally {
          if (completed) {
            this.socket?.removeEventListener("message", listener as never);
          }
        }
      };
      this.socket?.addEventListener("message", listener as never);
    });
  }
}
