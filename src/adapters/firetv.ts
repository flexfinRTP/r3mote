import type {
  AdapterConnectOptions,
  AdapterConnectResult,
  RemoteKey,
  TVAdapter
} from "./types";
import { AndroidTVAdapter } from "./androidtv";

export class FireTVAdapter implements TVAdapter {
  brand = "firetv" as const;
  private delegate = new AndroidTVAdapter();

  async connect(options: AdapterConnectOptions): Promise<AdapterConnectResult> {
    options.onInfo?.(
      "On Fire TV, enable Settings > My Fire TV > Developer Options > ADB Debugging, then accept the pairing prompt."
    );
    const result = await this.delegate.connect(options);
    if (!result.ok) {
      return {
        ...result,
        message:
          result.message ??
          "Fire TV pairing failed. Enable ADB Debugging and keep Fire TV awake while pairing."
      };
    }
    return result;
  }

  async submitCode(code: string): Promise<AdapterConnectResult> {
    if (!this.delegate.submitCode) {
      return { ok: false, message: "Fire TV code pairing unsupported." };
    }
    return await this.delegate.submitCode(code);
  }

  async disconnect(): Promise<void> {
    await this.delegate.disconnect();
  }

  async sendKey(key: RemoteKey): Promise<void> {
    await this.delegate.sendKey(key);
  }

  async ping(): Promise<boolean> {
    return await this.delegate.ping();
  }
}
