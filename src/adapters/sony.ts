import { withTimeout } from "@/utils/network";
import type {
  AdapterConnectOptions,
  AdapterConnectResult,
  RemoteKey,
  TVAdapter
} from "./types";

const IRCC_MAP: Partial<Record<RemoteKey, string>> = {
  power: "AAAAAQAAAAEAAAAVAw==",
  volume_up: "AAAAAQAAAAEAAAASAw==",
  volume_down: "AAAAAQAAAAEAAAATAw==",
  mute: "AAAAAQAAAAEAAAAUAw==",
  up: "AAAAAQAAAAEAAAB0Aw==",
  down: "AAAAAQAAAAEAAAB1Aw==",
  left: "AAAAAQAAAAEAAAA0Aw==",
  right: "AAAAAQAAAAEAAAAzAw==",
  select: "AAAAAQAAAAEAAABlAw==",
  back: "AAAAAgAAAJcAAAAjAw==",
  home: "AAAAAQAAAAEAAABgAw==",
  menu: "AAAAAQAAAAEAAABeAw==",
  play: "AAAAAgAAAJcAAAAaAw==",
  pause: "AAAAAgAAAJcAAAAZAw==",
  stop: "AAAAAgAAAJcAAAAYAw==",
  rewind: "AAAAAgAAAJcAAAAbAw==",
  forward: "AAAAAgAAAJcAAAAcAw==",
  input: "AAAAAQAAAAEAAAAlAw==",
  num_0: "AAAAAQAAAAEAAAAJAw==",
  num_1: "AAAAAQAAAAEAAAAAAw==",
  num_2: "AAAAAQAAAAEAAAABAw==",
  num_3: "AAAAAQAAAAEAAAACAw==",
  num_4: "AAAAAQAAAAEAAAADAw==",
  num_5: "AAAAAQAAAAEAAAAEAw==",
  num_6: "AAAAAQAAAAEAAAAFAw==",
  num_7: "AAAAAQAAAAEAAAAGAw==",
  num_8: "AAAAAQAAAAEAAAAHAw==",
  num_9: "AAAAAQAAAAEAAAAIAw=="
};

const xmlForCode = (code: string) => `<?xml version="1.0"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:X_SendIRCC xmlns:u="urn:schemas-sony-com:service:IRCC:1">
      <IRCCCode>${code}</IRCCCode>
    </u:X_SendIRCC>
  </s:Body>
</s:Envelope>`;

export class SonyAdapter implements TVAdapter {
  brand = "sony" as const;
  private ip = "";
  private psk = "";

  async connect(options: AdapterConnectOptions): Promise<AdapterConnectResult> {
    this.ip = options.ip;
    this.psk = options.psk ?? "";

    if (!this.psk) {
      return { ok: false, message: "Sony TV requires a Pre-Shared Key." };
    }

    const ok = await this.ping();
    if (!ok) {
      return {
        ok: false,
        message: "Sony TV unreachable or PSK invalid. Check IP Control settings."
      };
    }
    return { ok: true };
  }

  async disconnect(): Promise<void> {
    return;
  }

  async sendKey(key: RemoteKey): Promise<void> {
    if (!this.ip || !this.psk) {
      throw new Error("Sony TV is not connected.");
    }
    const code = IRCC_MAP[key];
    if (!code) {
      throw new Error(`Sony key not mapped: ${key}`);
    }

    const res = await withTimeout(
      fetch(`http://${this.ip}/sony/IRCC`, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=UTF-8",
          SOAPACTION: `"urn:schemas-sony-com:service:IRCC:1#X_SendIRCC"`,
          "X-Auth-PSK": this.psk
        },
        body: xmlForCode(code)
      }),
      4000
    );
    if (!res.ok) {
      throw new Error("Sony TV rejected the command. Check PSK and IP Control settings.");
    }
  }

  async ping(): Promise<boolean> {
    if (!this.ip || !this.psk) {
      return false;
    }
    try {
      const res = await withTimeout(
        fetch(`http://${this.ip}/sony/system`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Auth-PSK": this.psk
          },
          body: JSON.stringify({
            id: 20,
            method: "getPowerStatus",
            params: [],
            version: "1.0"
          })
        }),
        4000
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}
