import React from "react";
import { StyleProp, Text, TextStyle } from "react-native";

type IconProps = {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

let CachedMaterialIcon:
  | React.ComponentType<{ name: string; size?: number; color?: string; style?: StyleProp<TextStyle> }>
  | null
  | undefined;

const FALLBACK_GLYPHS: Record<string, string> = {
  cog: "[S]",
  power: "PWR",
  "arrow-left": "<",
  "home-outline": "H",
  "chevron-up": "^",
  "chevron-down": "v",
  "chevron-left": "<",
  "chevron-right": ">",
  "circle-small": "o",
  menu: "|||",
  "volume-off": "M",
  rewind: "<<",
  "play-pause": ">|",
  "fast-forward": ">>",
  star: "*",
  "rocket-launch": "R",
};

function getMaterialIcon() {
  if (CachedMaterialIcon !== undefined) {
    return CachedMaterialIcon;
  }
  try {
    // Keep icons optional so app still runs on older dev clients without ExpoFontLoader.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const vectorIcons = require("@expo/vector-icons");
    CachedMaterialIcon = vectorIcons.MaterialCommunityIcons ?? null;
  } catch {
    CachedMaterialIcon = null;
  }
  return CachedMaterialIcon;
}

export const AppIcon: React.FC<IconProps> = ({ name, size = 20, color = "#fff", style }) => {
  const MaterialIcon = getMaterialIcon();
  if (MaterialIcon) {
    return <MaterialIcon name={name} size={size} color={color} style={style} />;
  }

  return (
    <Text style={[{ fontSize: size, color, fontWeight: "700", lineHeight: size + 2 }, style]}>
      {FALLBACK_GLYPHS[name] ?? "."}
    </Text>
  );
};
