import type {
  AdapterConnectOptions,
  AdapterConnectResult,
  RemoteKey,
  TVAdapter
} from "./types";

const AndroidTVRemoteLib = require("react-native-androidtv-remote");

const RemoteDirection =
  AndroidTVRemoteLib.RemoteDirection ?? ({ SHORT: "SHORT" } as const);

const KEY_MAP: Record<RemoteKey, number> = {
  power: 26,
  volume_up: 24,
  volume_down: 25,
  mute: 164,
  channel_up: 166,
  channel_down: 167,
  up: 19,
  down: 20,
  left: 21,
  right: 22,
  select: 23,
  back: 4,
  home: 3,
  menu: 82,
  guide: 172,
  play: 126,
  pause: 127,
  stop: 86,
  rewind: 89,
  forward: 90,
  input: 178,
  num_0: 7,
  num_1: 8,
  num_2: 9,
  num_3: 10,
  num_4: 11,
  num_5: 12,
  num_6: 13,
  num_7: 14,
  num_8: 15,
  num_9: 16
};

type Deferred<T> = {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  promise: Promise<T>;
};

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { resolve, reject, promise };
};

export class AndroidTVAdapter implements TVAdapter {
  brand = "androidtv" as const;
  private ip = "";
  private remote: any = null;
  private cert: AdapterConnectResult["certificate"];
  private waitingForCode = false;
  private readyGate: Deferred<AdapterConnectResult> | null = null;

  async connect(options: AdapterConnectOptions): Promise<AdapterConnectResult> {
    this.ip = options.ip;
    this.waitingForCode = false;
    this.readyGate = deferred<AdapterConnectResult>();

    const AndroidRemote = AndroidTVRemoteLib.default ?? AndroidTVRemoteLib;
    this.remote = new AndroidRemote(this.ip, {
      pairing_port: 6467,
      remote_port: 6466,
      service_name: "com.family.r3mote",
      cert: options.certificate ?? {
        key: null,
        cert: null,
        androidKeyStore: "AndroidKeyStore",
        certAlias: "r3mote-atv-cert",
        keyAlias: "r3mote-atv-key"
      }
    });

    this.remote.on("secret", () => {
      this.waitingForCode = true;
      options.onInfo?.(
        "Enter the 6-digit code shown on your Android TV screen to finish pairing."
      );
      this.readyGate?.resolve({
        ok: false,
        message: "Pairing code required from TV screen."
      });
    });

    this.remote.on("ready", () => {
      this.cert = this.remote.getCertificate?.() ?? undefined;
      this.waitingForCode = false;
      this.readyGate?.resolve({
        ok: true,
        certificate: this.cert
      });
    });

    this.remote.on("error", (err: Error) => {
      this.readyGate?.resolve({
        ok: false,
        message:
          err?.message ||
          "Android TV connection error. Ensure Google TV Remote Service is enabled."
      });
    });

    try {
      await this.remote.start();
    } catch (err) {
      return {
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : "Android TV did not respond. Ensure both devices are on same WiFi."
      };
    }

    const result = await Promise.race([
      this.readyGate.promise,
      new Promise<AdapterConnectResult>((resolve) =>
        setTimeout(() => {
          if (this.waitingForCode) {
            resolve({
              ok: false,
              message: "Pairing code required."
            });
            return;
          }
          resolve({
            ok: false,
            message: "No response from Android TV. Wake the TV and retry."
          });
        }, 6000)
      )
    ]);

    return result;
  }

  async submitCode(code: string): Promise<AdapterConnectResult> {
    if (!this.remote) {
      return { ok: false, message: "Adapter is not initialized." };
    }
    if (!this.waitingForCode) {
      return { ok: false, message: "Adapter is not waiting for a code." };
    }

    this.readyGate = deferred<AdapterConnectResult>();
    this.remote.sendCode(code);
    return await Promise.race([
      this.readyGate.promise,
      new Promise<AdapterConnectResult>((resolve) =>
        setTimeout(
          () =>
            resolve({
              ok: false,
              message: "Pairing timed out. Try entering code again."
            }),
          10000
        )
      )
    ]);
  }

  async disconnect(): Promise<void> {
    try {
      this.remote?.stop?.();
    } finally {
      this.remote = null;
    }
  }

  async sendKey(key: RemoteKey): Promise<void> {
    if (!this.remote) {
      throw new Error("Android TV is not connected.");
    }
    const keyCode = KEY_MAP[key];
    this.remote.sendKey(keyCode, RemoteDirection.SHORT ?? "SHORT");
  }

  async ping(): Promise<boolean> {
    return Boolean(this.remote);
  }
}
