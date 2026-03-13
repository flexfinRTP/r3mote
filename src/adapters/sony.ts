import { withTimeout } from "@/utils/network";
import type {
  AdapterConnectOptions,
  AdapterConnectResult,
  RemoteKey,
  TVAdapter,
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
  guide: "AAAAAgAAAKQAAABbAw==",
  num_0: "AAAAAQAAAAEAAAAJAw==",
  num_1: "AAAAAQAAAAEAAAAAAw==",
  num_2: "AAAAAQAAAAEAAAABAw==",
  num_3: "AAAAAQAAAAEAAAACAw==",
  num_4: "AAAAAQAAAAEAAAADAw==",
  num_5: "AAAAAQAAAAEAAAAEAw==",
  num_6: "AAAAAQAAAAEAAAAFAw==",
  num_7: "AAAAAQAAAAEAAAAGAw==",
  num_8: "AAAAAQAAAAEAAAAHAw==",
  num_9: "AAAAAQAAAAEAAAAIAw==",
};

const xmlForCode = (code: string) =>
  `<?xml version="1.0"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:X_SendIRCC xmlns:u="urn:schemas-sony-com:service:IRCC:1">
      <IRCCCode>${code}</IRCCCode>
    </u:X_SendIRCC>
  </s:Body>
</s:Envelope>`;

const b64 = (s: string): string => {
  if (typeof globalThis.btoa === "function") return globalThis.btoa(s);
  return s;
};

const CLIENT_ID = "R3mote:r3mote-app-001";
const NICKNAME = "R3mote";

const DEFAULT_PSKS = ["0000", "1234", "0000", ""];

/**
 * Sony returns HTTP 200 even on auth failures — the real status is in the
 * JSON body: { "result": [...] } on success, { "error": [...] } on failure.
 */
const bodyHasResult = (body: string): boolean => {
  if (body.includes('"error"')) return false;
  return body.includes('"result"');
};

export class SonyAdapter implements TVAdapter {
  brand = "sony" as const;
  private ip = "";
  private authCookie = "";
  private psk = "";

  async connect(options: AdapterConnectOptions): Promise<AdapterConnectResult> {
    this.ip = options.ip;
    this.authCookie = options.authToken ?? "";
    this.psk = options.psk ?? "";

    // Step 1: check if the TV's REST API is reachable at all
    options.onInfo?.("Checking if Sony TV is reachable...");
    const reachable = await this.isTvReachable();
    if (!reachable) {
      return {
        ok: false,
        message:
          "Cannot reach Sony TV at " +
          this.ip +
          ". Make sure the TV is ON and connected to the same WiFi network.",
      };
    }
    options.onInfo?.("Sony TV found! Trying to authenticate...");

    // Step 2: try saved auth cookie from previous PIN pairing
    if (this.authCookie) {
      options.onInfo?.("Trying saved credentials...");
      const ok = await this.verifyAuth(this.buildAuthHeaders());
      if (ok) return { ok: true, authToken: this.authCookie };
    }

    // Step 3: try saved PSK
    if (this.psk) {
      options.onInfo?.("Trying saved key...");
      const ok = await this.verifyAuth({ "X-Auth-PSK": this.psk });
      if (ok) return { ok: true, authToken: this.psk };
    }

    // Step 4: try common default PSKs
    options.onInfo?.("Trying default keys (0000, 1234)...");
    for (const tryPsk of DEFAULT_PSKS) {
      const ok = await this.verifyAuth({ "X-Auth-PSK": tryPsk });
      if (ok) {
        this.psk = tryPsk;
        options.onInfo?.("Connected using default key!");
        return { ok: true, authToken: tryPsk || "__no_psk__" };
      }
    }

    // Step 5: try completely no auth (TV set to "None" mode)
    options.onInfo?.("Trying no-auth mode...");
    const noAuthOk = await this.verifyAuth({});
    if (noAuthOk) {
      options.onInfo?.("Connected — no authentication required!");
      return { ok: true, authToken: "__none__" };
    }

    // Step 6: PIN pairing via actRegister
    options.onInfo?.("Requesting PIN from your Sony TV...");
    const pinResult = await this.startPinPairing();

    if (pinResult === "pin_shown") {
      options.onInfo?.(
        "A 4-digit PIN should now be on your Sony TV screen. Enter it below."
      );
      return {
        ok: false,
        needsCode: true,
        message: "Enter the 4-digit PIN shown on your Sony TV screen.",
      };
    }

    if (pinResult === "not_supported") {
      return {
        ok: false,
        needsCode: false,
        message:
          "Sony TV does not support PIN pairing with current settings.\n\n" +
          "Please try ONE of these on your TV:\n\n" +
          "Option A — Set a Pre-Shared Key:\n" +
          '  Settings → Network → Home Network → IP Control → Pre-Shared Key → set to "0000"\n\n' +
          "Option B — Enable PIN pairing:\n" +
          '  Settings → Network → Home Network → IP Control → Authentication → set to "Normal and Pre-Shared Key"\n\n' +
          "Then tap Connect again.",
      };
    }

    return {
      ok: false,
      needsCode: false,
      message:
        "Could not connect to Sony TV.\n\n" +
        "Make sure TV is ON, then check:\n" +
        "  Settings → Network → Home Network → IP Control\n" +
        '  → Authentication → "Normal and Pre-Shared Key"\n' +
        '  → Pre-Shared Key → set to "0000"\n\n' +
        "Then tap Connect again.",
    };
  }

  async submitCode(pin: string): Promise<AdapterConnectResult> {
    if (!this.ip) {
      return { ok: false, message: "No IP set. Reconnect." };
    }

    try {
      const authValue = b64(`:${pin}`);
      const authHeader = `Basic ${authValue}`;

      const res = await withTimeout(
        fetch(`http://${this.ip}/sony/accessControl`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
            Connection: "keep-alive",
          },
          body: JSON.stringify({
            method: "actRegister",
            version: "1.0",
            id: 8,
            params: [
              {
                clientid: CLIENT_ID,
                nickname: NICKNAME,
                level: "private",
              },
              [{ value: "yes", function: "WOL" }],
            ],
          }),
        }),
        10000
      );

      const responseBody = await res.text().catch(() => "");

      // Check if the response indicates an error
      if (responseBody.includes('"error"') && !responseBody.includes('"result"')) {
        return {
          ok: false,
          message:
            "PIN was not accepted. Check the PIN on your TV screen and try again.",
        };
      }

      // Extract auth cookie from Set-Cookie header
      const setCookie = res.headers.get("set-cookie") || "";
      const cookieMatch = setCookie.match(/auth=([^;]+)/);
      const cookie = cookieMatch ? `auth=${cookieMatch[1]}` : "";

      if (cookie) {
        this.authCookie = cookie;
      } else {
        // Use the Basic Auth header itself as our token
        this.authCookie = authHeader;
      }

      // Verify IRCC commands will work
      const works = await this.verifyAuth(this.buildAuthHeaders());
      if (works) {
        return { ok: true, authToken: this.authCookie };
      }

      // Cookie-based auth sometimes needs the cookie on root path
      if (cookie) {
        const worksWithCookie = await this.verifyAuth({ Cookie: cookie });
        if (worksWithCookie) {
          this.authCookie = cookie;
          return { ok: true, authToken: this.authCookie };
        }
      }

      return {
        ok: false,
        message:
          "PIN accepted but commands still fail. " +
          'Try setting your TV to Pre-Shared Key mode with key "0000" instead.',
      };
    } catch {
      return {
        ok: false,
        message:
          "Sony PIN pairing timed out. Make sure the TV is still on and try again.",
      };
    }
  }

  async disconnect(): Promise<void> {
    return;
  }

  async sendKey(key: RemoteKey): Promise<void> {
    if (!this.ip) throw new Error("Sony TV is not connected.");
    const code = IRCC_MAP[key];
    if (!code) throw new Error(`Key not supported: ${key}`);

    const headers: Record<string, string> = {
      "Content-Type": "text/xml; charset=UTF-8",
      SOAPACTION: '"urn:schemas-sony-com:service:IRCC:1#X_SendIRCC"',
      ...this.buildAuthHeaders(),
    };

    const res = await withTimeout(
      fetch(`http://${this.ip}/sony/IRCC`, {
        method: "POST",
        headers,
        body: xmlForCode(code),
      }),
      4000
    );
    if (!res.ok) {
      throw new Error(
        `Command rejected (HTTP ${res.status}). Try reconnecting.`
      );
    }
  }

  async ping(): Promise<boolean> {
    if (!this.ip) return false;
    return this.verifyAuth(this.buildAuthHeaders());
  }

  private buildAuthHeaders(): Record<string, string> {
    const h: Record<string, string> = {};
    if (this.psk) {
      h["X-Auth-PSK"] = this.psk;
    }
    if (this.authCookie) {
      if (this.authCookie.startsWith("Basic ")) {
        h.Authorization = this.authCookie;
      } else if (this.authCookie.startsWith("auth=")) {
        h.Cookie = this.authCookie;
      } else if (
        this.authCookie !== "__none__" &&
        this.authCookie !== "__no_psk__"
      ) {
        h["X-Auth-PSK"] = this.authCookie;
      }
    }
    return h;
  }

  /**
   * Quick reachability check — can we even hit /sony/system?
   * Ignores auth status, just checks the endpoint exists.
   */
  private async isTvReachable(): Promise<boolean> {
    try {
      const res = await withTimeout(
        fetch(`http://${this.ip}/sony/system`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: 99,
            method: "getPowerStatus",
            params: [],
            version: "1.0",
          }),
        }),
        4000
      );
      // Any response (200, 401, 403) means the TV API is running
      return res.status >= 200 && res.status < 500;
    } catch {
      return false;
    }
  }

  /**
   * Verify auth by checking the response BODY (not HTTP status).
   * Sony returns HTTP 200 even for auth failures; the real result
   * is in the JSON: { "result": [...] } = success, { "error": [...] } = fail.
   */
  private async verifyAuth(
    extraHeaders: Record<string, string>
  ): Promise<boolean> {
    try {
      const res = await withTimeout(
        fetch(`http://${this.ip}/sony/system`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...extraHeaders,
          },
          body: JSON.stringify({
            id: 20,
            method: "getPowerStatus",
            params: [],
            version: "1.0",
          }),
        }),
        3000
      );
      if (!res.ok) return false;
      const body = await res.text();
      return bodyHasResult(body);
    } catch {
      return false;
    }
  }

  /**
   * Initiate PIN pairing via actRegister.
   * Matches the proven braviarc library format:
   * - "level": "private" in client params
   * - "Connection: keep-alive" header
   * Returns:
   *  "pin_shown"     — TV should be displaying a PIN
   *  "not_supported" — TV auth mode doesn't support PIN pairing
   *  "error"         — network or other failure
   */
  private async startPinPairing(): Promise<
    "pin_shown" | "not_supported" | "error"
  > {
    try {
      const body = JSON.stringify({
        method: "actRegister",
        version: "1.0",
        id: 8,
        params: [
          {
            clientid: CLIENT_ID,
            nickname: NICKNAME,
            level: "private",
          },
          [{ value: "yes", function: "WOL" }],
        ],
      });

      const res = await withTimeout(
        fetch(`http://${this.ip}/sony/accessControl`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Connection: "keep-alive",
          },
          body,
        }),
        8000
      );

      // 401 = TV is showing a PIN and wants Basic Auth challenge response
      if (res.status === 401) return "pin_shown";

      // 200 = might be already registered (no PIN needed) or showing PIN
      if (res.status === 200) {
        const text = await res.text().catch(() => "");
        // If we get a result with no error, we might already be registered
        if (bodyHasResult(text)) return "pin_shown";
        // If we get an error in the body, TV might not support this
        if (text.includes('"error"')) return "not_supported";
        // Any other 200 response — assume PIN is shown
        return "pin_shown";
      }

      // 403 = authentication method doesn't support actRegister (PSK-only mode)
      if (res.status === 403) return "not_supported";

      // Other status codes
      return "not_supported";
    } catch {
      return "error";
    }
  }
}
