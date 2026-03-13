import type { RemoteKey } from "@/adapters/types";

/**
 * NEC protocol: 38 kHz carrier, 32-bit codes.
 * ConsumerIrManager expects alternating mark/space durations in microseconds.
 */
const necToPattern = (hex: number): number[] => {
  const p: number[] = [9000, 4500];
  for (let i = 31; i >= 0; i--) {
    p.push(562);
    p.push((hex >>> i) & 1 ? 1687 : 562);
  }
  p.push(562);
  return p;
};

/**
 * Sony SIRC 12-bit: 40 kHz carrier.
 * 7-bit command (LSB first) + 5-bit address (LSB first).
 */
const sircToPattern = (command: number, address: number): number[] => {
  const p: number[] = [2400, 600];
  for (let i = 0; i < 7; i++) {
    p.push((command >> i) & 1 ? 1200 : 600);
    p.push(600);
  }
  for (let i = 0; i < 5; i++) {
    p.push((address >> i) & 1 ? 1200 : 600);
    p.push(600);
  }
  return p;
};

type IRCodeSet = {
  frequency: number;
  codes: Partial<Record<RemoteKey, number[]>>;
};

export type IRBrandKey =
  | "samsung"
  | "lg"
  | "sony"
  | "panasonic"
  | "vizio"
  | "hisense"
  | "tcl"
  | "sharp"
  | "toshiba"
  | "philips"
  | "universal";

const samsung: IRCodeSet = {
  frequency: 38000,
  codes: {
    power: necToPattern(0xe0e040bf),
    volume_up: necToPattern(0xe0e0e01f),
    volume_down: necToPattern(0xe0e0d02f),
    mute: necToPattern(0xe0e0f00f),
    channel_up: necToPattern(0xe0e048b7),
    channel_down: necToPattern(0xe0e008f7),
    input: necToPattern(0xe0e0807f),
    up: necToPattern(0xe0e006f9),
    down: necToPattern(0xe0e08679),
    left: necToPattern(0xe0e0a659),
    right: necToPattern(0xe0e046b9),
    select: necToPattern(0xe0e016e9),
    menu: necToPattern(0xe0e058a7),
    back: necToPattern(0xe0e01ae5),
    home: necToPattern(0xe0e09e61),
    guide: necToPattern(0xe0e0f20d),
    play: necToPattern(0xe0e0e21d),
    pause: necToPattern(0xe0e052ad),
    stop: necToPattern(0xe0e0629d),
    rewind: necToPattern(0xe0e0a25d),
    forward: necToPattern(0xe0e012ed),
    num_0: necToPattern(0xe0e08877),
    num_1: necToPattern(0xe0e020df),
    num_2: necToPattern(0xe0e0a05f),
    num_3: necToPattern(0xe0e0609f),
    num_4: necToPattern(0xe0e010ef),
    num_5: necToPattern(0xe0e0906f),
    num_6: necToPattern(0xe0e050af),
    num_7: necToPattern(0xe0e030cf),
    num_8: necToPattern(0xe0e0b04f),
    num_9: necToPattern(0xe0e0708f),
  },
};

const lg: IRCodeSet = {
  frequency: 38000,
  codes: {
    power: necToPattern(0x20df10ef),
    volume_up: necToPattern(0x20df40bf),
    volume_down: necToPattern(0x20dfc03f),
    mute: necToPattern(0x20df906f),
    channel_up: necToPattern(0x20df00ff),
    channel_down: necToPattern(0x20df807f),
    input: necToPattern(0x20dfd02f),
    up: necToPattern(0x20df02fd),
    down: necToPattern(0x20df827d),
    left: necToPattern(0x20dfe01f),
    right: necToPattern(0x20df609f),
    select: necToPattern(0x20df22dd),
    menu: necToPattern(0x20dfc23d),
    back: necToPattern(0x20df14eb),
    home: necToPattern(0x20df3ec1),
    guide: necToPattern(0x20dfd52a),
    play: necToPattern(0x20df0df2),
    pause: necToPattern(0x20df5da2),
    stop: necToPattern(0x20df8d72),
    rewind: necToPattern(0x20dff10e),
    forward: necToPattern(0x20df718e),
    num_0: necToPattern(0x20df08f7),
    num_1: necToPattern(0x20df8877),
    num_2: necToPattern(0x20df48b7),
    num_3: necToPattern(0x20dfc837),
    num_4: necToPattern(0x20df28d7),
    num_5: necToPattern(0x20dfa857),
    num_6: necToPattern(0x20df6897),
    num_7: necToPattern(0x20dfe817),
    num_8: necToPattern(0x20df18e7),
    num_9: necToPattern(0x20df9867),
  },
};

const sony: IRCodeSet = {
  frequency: 40000,
  codes: {
    power: sircToPattern(21, 1),
    volume_up: sircToPattern(18, 1),
    volume_down: sircToPattern(19, 1),
    mute: sircToPattern(20, 1),
    channel_up: sircToPattern(16, 1),
    channel_down: sircToPattern(17, 1),
    input: sircToPattern(37, 1),
    up: sircToPattern(116, 1),
    down: sircToPattern(117, 1),
    left: sircToPattern(52, 1),
    right: sircToPattern(51, 1),
    select: sircToPattern(101, 1),
    menu: sircToPattern(96, 1),
    back: sircToPattern(99, 1),
    home: sircToPattern(96, 1),
    guide: sircToPattern(113, 1),
    play: sircToPattern(50, 1),
    pause: sircToPattern(57, 1),
    stop: sircToPattern(56, 1),
    rewind: sircToPattern(51, 1),
    forward: sircToPattern(52, 1),
    num_0: sircToPattern(0, 1),
    num_1: sircToPattern(1, 1),
    num_2: sircToPattern(2, 1),
    num_3: sircToPattern(3, 1),
    num_4: sircToPattern(4, 1),
    num_5: sircToPattern(5, 1),
    num_6: sircToPattern(6, 1),
    num_7: sircToPattern(7, 1),
    num_8: sircToPattern(8, 1),
    num_9: sircToPattern(9, 1),
  },
};

const panasonic: IRCodeSet = {
  frequency: 37000,
  codes: {
    power: necToPattern(0x400401fc),
    volume_up: necToPattern(0x40040020),
    volume_down: necToPattern(0x40040021),
    mute: necToPattern(0x40040032),
    channel_up: necToPattern(0x40040034),
    channel_down: necToPattern(0x40040035),
    input: necToPattern(0x400400f0),
    up: necToPattern(0x40040052),
    down: necToPattern(0x40040053),
    left: necToPattern(0x40040072),
    right: necToPattern(0x40040073),
    select: necToPattern(0x40040049),
    menu: necToPattern(0x40040006),
    back: necToPattern(0x40040027),
    home: necToPattern(0x40040169),
    guide: necToPattern(0x40040050),
    play: necToPattern(0x40040038),
    pause: necToPattern(0x40040039),
    stop: necToPattern(0x4004003a),
    rewind: necToPattern(0x4004003d),
    forward: necToPattern(0x4004003c),
  },
};

const vizio: IRCodeSet = {
  frequency: 38000,
  codes: {
    power: necToPattern(0x20df10ef),
    volume_up: necToPattern(0x20df40bf),
    volume_down: necToPattern(0x20dfc03f),
    mute: necToPattern(0x20df906f),
    channel_up: necToPattern(0x20df00ff),
    channel_down: necToPattern(0x20df807f),
    input: necToPattern(0x20dfd02f),
    up: necToPattern(0x20df02fd),
    down: necToPattern(0x20df827d),
    left: necToPattern(0x20dfe01f),
    right: necToPattern(0x20df609f),
    select: necToPattern(0x20df22dd),
    menu: necToPattern(0x20dfc23d),
    back: necToPattern(0x20df14eb),
  },
};

const hisense: IRCodeSet = {
  frequency: 38000,
  codes: {
    power: necToPattern(0x00ff00ff),
    volume_up: necToPattern(0x00ff10ef),
    volume_down: necToPattern(0x00ff11ee),
    mute: necToPattern(0x00ff12ed),
    channel_up: necToPattern(0x00ff14eb),
    channel_down: necToPattern(0x00ff15ea),
    input: necToPattern(0x00ff04fb),
    up: necToPattern(0x00ff44bb),
    down: necToPattern(0x00ff45ba),
    left: necToPattern(0x00ff47b8),
    right: necToPattern(0x00ff46b9),
    select: necToPattern(0x00ff43bc),
    menu: necToPattern(0x00ff06f9),
    back: necToPattern(0x00ff48b7),
    home: necToPattern(0x00ff56a9),
  },
};

const tcl: IRCodeSet = {
  frequency: 38000,
  codes: {
    power: necToPattern(0x00ff00ff),
    volume_up: necToPattern(0x00ff10ef),
    volume_down: necToPattern(0x00ff11ee),
    mute: necToPattern(0x00ff12ed),
    channel_up: necToPattern(0x00ff14eb),
    channel_down: necToPattern(0x00ff15ea),
    input: necToPattern(0x00ff04fb),
    up: necToPattern(0x00ff44bb),
    down: necToPattern(0x00ff45ba),
    left: necToPattern(0x00ff47b8),
    right: necToPattern(0x00ff46b9),
    select: necToPattern(0x00ff43bc),
    menu: necToPattern(0x00ff06f9),
    back: necToPattern(0x00ff48b7),
  },
};

const sharp: IRCodeSet = {
  frequency: 38000,
  codes: {
    power: necToPattern(0xa51e38c7),
    volume_up: necToPattern(0xa51e50af),
    volume_down: necToPattern(0xa51ed02f),
    mute: necToPattern(0xa51ea05f),
    channel_up: necToPattern(0xa51e48b7),
    channel_down: necToPattern(0xa51ec837),
    input: necToPattern(0xa51ea857),
    up: necToPattern(0xa51eca35),
    down: necToPattern(0xa51e4ab5),
    left: necToPattern(0xa51e8a75),
    right: necToPattern(0xa51e0af5),
    select: necToPattern(0xa51ec23d),
  },
};

const toshiba: IRCodeSet = {
  frequency: 38000,
  codes: {
    power: necToPattern(0x02fd48b7),
    volume_up: necToPattern(0x02fd58a7),
    volume_down: necToPattern(0x02fd7887),
    mute: necToPattern(0x02fda857),
    channel_up: necToPattern(0x02fdd827),
    channel_down: necToPattern(0x02fdf807),
    input: necToPattern(0x02fdf00f),
    up: necToPattern(0x02fd41be),
    down: necToPattern(0x02fdc13e),
    left: necToPattern(0x02fd8976),
    right: necToPattern(0x02fd09f6),
    select: necToPattern(0x02fd44bb),
  },
};

const philips: IRCodeSet = {
  frequency: 38000,
  codes: {
    power: necToPattern(0x40bf12ed),
    volume_up: necToPattern(0x40bf10ef),
    volume_down: necToPattern(0x40bf11ee),
    mute: necToPattern(0x40bf13ec),
    channel_up: necToPattern(0x40bf20df),
    channel_down: necToPattern(0x40bf21de),
    input: necToPattern(0x40bf38c7),
    up: necToPattern(0x40bfa05f),
    down: necToPattern(0x40bf00ff),
    left: necToPattern(0x40bf6897),
    right: necToPattern(0x40bf40bf),
    select: necToPattern(0x40bfa857),
  },
};

export const IR_BRANDS: Record<IRBrandKey, IRCodeSet> = {
  samsung,
  lg,
  sony,
  panasonic,
  vizio,
  hisense,
  tcl,
  sharp,
  toshiba,
  philips,
  universal: samsung, // Samsung NEC codes work on many TVs as a universal fallback
};

export const IR_BRAND_LABELS: Record<IRBrandKey, string> = {
  samsung: "Samsung",
  lg: "LG",
  sony: "Sony",
  panasonic: "Panasonic",
  vizio: "Vizio",
  hisense: "Hisense",
  tcl: "TCL",
  sharp: "Sharp",
  toshiba: "Toshiba",
  philips: "Philips",
  universal: "Universal (try first)",
};

export const IR_BRAND_KEYS: IRBrandKey[] = [
  "universal",
  "samsung",
  "lg",
  "sony",
  "panasonic",
  "vizio",
  "hisense",
  "tcl",
  "sharp",
  "toshiba",
  "philips",
];
