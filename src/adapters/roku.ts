import { withTimeout } from "@/utils/network";
import type {
  AdapterConnectOptions,
  AdapterConnectResult,
  RemoteKey,
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

  async connect(options: AdapterConnectOptions): Promise<AdapterConnectResult> {
    this.ip = options.ip;
    const ok = await this.ping();
    if (!ok) {
      return { ok: false, message: "Roku did not respond on port 8060." };
    }
    return { ok: true };
  }

  async disconnect(): Promise<void> {
    return;
  }

  async sendKey(key: RemoteKey): Promise<void> {
    if (!this.ip) {
      throw new Error("Roku not connected.");
    }
    const mapped = KEY_MAP[key];
    const res = await withTimeout(
      fetch(`http://${this.ip}:8060/keypress/${mapped}`, { method: "POST" }),
      3000
    );
    if (!res.ok) {
      throw new Error("Roku rejected the command.");
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
}
