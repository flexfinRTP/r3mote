import { withTimeout } from "@/utils/network";
import type {
  AdapterConnectOptions,
  AdapterConnectResult,
  RemoteKey,
  StreamingApp,
  TVAdapter
} from "./types";

const KEY_MAP: Record<RemoteKey, string> = {
  power: "Power",
  volume_up: "VolumeUp",
  volume_down: "VolumeDown",
  mute: "VolumeMute",
  channel_up: "ChannelUp",
  channel_down: "ChannelDown",
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
  select: "Select",
  back: "Back",
  home: "Home",
  menu: "Info",
  guide: "Guide",
  play: "Play",
  pause: "Play",
  stop: "Play",
  rewind: "Rev",
  forward: "Fwd",
  input: "InputTuner",
  num_0: "Lit_0",
  num_1: "Lit_1",
  num_2: "Lit_2",
  num_3: "Lit_3",
  num_4: "Lit_4",
  num_5: "Lit_5",
  num_6: "Lit_6",
  num_7: "Lit_7",
  num_8: "Lit_8",
  num_9: "Lit_9"
};

export class RokuAdapter implements TVAdapter {
  brand = "roku" as const;
  private ip = "";

  private static readonly APP_IDS: Record<StreamingApp, string> = {
    netflix: "12",
    disney: "291097",
    prime: "13"
  };

  async connect(options: AdapterConnectOptions): Promise<AdapterConnectResult> {
    this.ip = options.ip;
    const infoRes = await withTimeout(
      fetch(`http://${this.ip}:8060/query/device-info`),
      3000
    ).catch(() => null);
    if (!infoRes?.ok) {
      return { ok: false, message: "Roku did not respond on port 8060." };
    }
    const info = await infoRes.text().catch(() => "");
    const macMatch = info.match(
      /<(?:wifi-mac|network-mac|ethernet-mac)>([^<]+)<\/(?:wifi-mac|network-mac|ethernet-mac)>/i
    );
    return { ok: true, mac: macMatch?.[1] };
  }

  async disconnect(): Promise<void> {
    return;
  }

  async sendKey(key: RemoteKey): Promise<void> {
    if (!this.ip) {
      throw new Error("Roku not connected.");
    }
    const mapped = KEY_MAP[key];
    const res = await this.postToRoku(`/keypress/${mapped}`);
    if (!res.ok) {
      throw new Error("Roku rejected the command.");
    }
  }

  async sendText(text: string): Promise<void> {
    if (!this.ip) {
      throw new Error("Roku not connected.");
    }
    const trimmed = text.trim();
    if (!trimmed) return;

    for (const char of trimmed) {
      const encoded = encodeURIComponent(char);
      const res = await this.postToRoku(`/keypress/Lit_${encoded}`);
      if (!res.ok) {
        throw new Error("Roku text entry failed.");
      }
    }
  }

  async launchApp(app: StreamingApp): Promise<void> {
    if (!this.ip) {
      throw new Error("Roku not connected.");
    }
    const appId = RokuAdapter.APP_IDS[app];
    const res = await this.postToRoku(`/launch/${appId}`);
    if (!res.ok) {
      throw new Error(`${app} launch failed on Roku.`);
    }
  }

  async ping(): Promise<boolean> {
    if (!this.ip) {
      return false;
    }
    try {
      const res = await withTimeout(
        fetch(`http://${this.ip}:8060/query/device-info`),
        3000
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  private async postToRoku(path: string): Promise<Response> {
    return await withTimeout(
      fetch(`http://${this.ip}:8060${path}`, { method: "POST" }),
      3000
    );
  }
}
