import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { RemoteKey } from "@/adapters";
import { theme } from "@/theme";
import { AppIcon } from "./AppIcon";

const SIZE = 240;
const OK_SIZE = 76;
const ARROW_HIT = 58;
const EDGE = 12;

type Props = {
  onKey: (key: RemoteKey) => void;
};

export const DPad: React.FC<Props> = ({ onKey }) => (
  <View style={styles.circle}>
    <View style={styles.crossH} />
    <View style={styles.crossV} />

    <Pressable
      style={({ pressed }) => [styles.zone, styles.up, pressed && styles.zonePressed]}
      onPress={() => onKey("up")}
    >
      <AppIcon name="chevron-up" size={36} color={theme.colors.warning} />
    </Pressable>

    <Pressable
      style={({ pressed }) => [styles.zone, styles.left, pressed && styles.zonePressed]}
      onPress={() => onKey("left")}
    >
      <AppIcon name="chevron-left" size={36} color={theme.colors.warning} />
    </Pressable>

    <Pressable
      style={({ pressed }) => [styles.ok, pressed && styles.okPressed]}
      onPress={() => onKey("select")}
    >
      <AppIcon name="circle-small" size={48} color={theme.colors.text} />
    </Pressable>

    <Pressable
      style={({ pressed }) => [styles.zone, styles.right, pressed && styles.zonePressed]}
      onPress={() => onKey("right")}
    >
      <AppIcon name="chevron-right" size={36} color={theme.colors.warning} />
    </Pressable>

    <Pressable
      style={({ pressed }) => [styles.zone, styles.down, pressed && styles.zonePressed]}
      onPress={() => onKey("down")}
    >
      <AppIcon name="chevron-down" size={36} color={theme.colors.warning} />
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    overflow: "hidden",
    alignSelf: "center",
  },
  crossH: {
    position: "absolute",
    top: SIZE / 2,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  crossV: {
    position: "absolute",
    left: SIZE / 2,
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  zone: {
    position: "absolute",
    width: ARROW_HIT,
    height: ARROW_HIT,
    borderRadius: ARROW_HIT / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  zonePressed: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  up: {
    top: EDGE,
    left: (SIZE - ARROW_HIT) / 2,
  },
  down: {
    bottom: EDGE,
    left: (SIZE - ARROW_HIT) / 2,
  },
  left: {
    left: EDGE,
    top: (SIZE - ARROW_HIT) / 2,
  },
  right: {
    right: EDGE,
    top: (SIZE - ARROW_HIT) / 2,
  },
  ok: {
    position: "absolute",
    width: OK_SIZE,
    height: OK_SIZE,
    borderRadius: OK_SIZE / 2,
    top: (SIZE - OK_SIZE) / 2,
    left: (SIZE - OK_SIZE) / 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  okPressed: {
    backgroundColor: theme.colors.surfacePressed,
  },
});
