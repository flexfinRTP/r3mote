import { AndroidTVAdapter } from "./androidtv";
import { FireTVAdapter } from "./firetv";
import { LGAdapter } from "./lg";
import { RokuAdapter } from "./roku";
import { SamsungAdapter } from "./samsung";
import { SonyAdapter } from "./sony";
import type { TVAdapter, TVBrand } from "./types";
import { VizioAdapter } from "./vizio";

export * from "./types";

export const createAdapter = (brand: TVBrand): TVAdapter => {
  switch (brand) {
    case "roku":
      return new RokuAdapter();
    case "samsung":
      return new SamsungAdapter();
    case "lg":
      return new LGAdapter();
    case "sony":
      return new SonyAdapter();
    case "vizio":
      return new VizioAdapter();
    case "androidtv":
      return new AndroidTVAdapter();
    case "firetv":
      return new FireTVAdapter();
    default:
      return new RokuAdapter();
  }
};
