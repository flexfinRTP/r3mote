declare module "react-native-androidtv-remote";
declare module "react-native-zeroconf";
declare module "react-native-udp";
declare module "react-native-infrared-interface" {
  export function hasIrEmitter(): Promise<boolean>;
  export function getCarrierFrequencies(): Promise<Array<{ minFrequency: number; maxFrequency: number }>>;
  export function transmit(carrierFrequency: number, pattern: string): Promise<boolean>;
}
declare module "react-native-tcp-socket";
