import { IR_BRANDS, type IRBrandKey } from "@/data/irCodes";
import type {
  AdapterConnectOptions,
  AdapterConnectResult,
  RemoteKey,
  TVAdapter,
  TVState,
} from "./types";

let infraredModule: {
  hasIrEmitter: () => Promise<boolean>;
  transmit: (frequency: number, pattern: string) => Promise<boolean>;
} | null = null;

const getIR = () => {
  if (!infraredModule) {
    try {
      infraredModule = require("react-native-infrared-interface");
    } catch {
      infraredModule = null;
    }
  }
  return infraredModule;
};

export class IRAdapter implements TVAdapter {
  brand = "ir" as const;
  private irBrand: IRBrandKey = "universal";
  private available = false;

  async connect(options: AdapterConnectOptions): Promise<AdapterConnectResult> {
    const ir = getIR();
    if (!ir) {
      return {
        ok: false,
        message:
          "IR blaster library not available. This device may not support infrared.",
      };
    }

    try {
      const has = await ir.hasIrEmitter();
      if (!has) {
        return {
          ok: false,
          message:
            "This phone does not have an IR blaster. IR mode only works on phones with built-in infrared hardware (some Samsung, Xiaomi, Huawei, etc.).",
        };
      }
    } catch {
      return {
        ok: false,
        message: "Could not check IR blaster hardware. Try restarting the app.",
      };
    }

    // Use irBrand from PSK field (overloaded for IR brand selection)
    if (options.psk && options.psk in IR_BRANDS) {
      this.irBrand = options.psk as IRBrandKey;
    }

    this.available = true;
    options.onInfo?.("IR blaster ready. Point phone at TV.");
    return { ok: true };
  }

  async disconnect(): Promise<void> {
    this.available = false;
  }

  async sendKey(key: RemoteKey): Promise<void> {
    if (!this.available) {
      throw new Error("IR blaster not connected. Reconnect first.");
    }

    const ir = getIR();
    if (!ir) {
      throw new Error("IR blaster library not loaded.");
    }

    const codeSet = IR_BRANDS[this.irBrand];
    if (!codeSet) {
      throw new Error(`No IR codes for brand: ${this.irBrand}`);
    }

    const pattern = codeSet.codes[key];
    if (!pattern) {
      throw new Error(
        `No IR code for "${key}" on ${this.irBrand}. Try a different TV brand.`
      );
    }

    // ConsumerIrManager expects a comma-separated string of durations
    const patternStr = pattern.join(",");

    try {
      await ir.transmit(codeSet.frequency, patternStr);
    } catch (err) {
      throw new Error(
        `IR transmit failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  async ping(): Promise<boolean> {
    return this.available;
  }

  async getState(): Promise<TVState> {
    return { power: true };
  }
}

/** Runtime check: does this device have an IR blaster? */
export const checkIRAvailable = async (): Promise<boolean> => {
  const ir = getIR();
  if (!ir) return false;
  try {
    return await ir.hasIrEmitter();
  } catch {
    return false;
  }
};
