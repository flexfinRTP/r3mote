import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { RemoteKey } from "@/adapters";
import { theme } from "@/theme";
import { AppIcon } from "./AppIcon";
import { DPad } from "./DPad";

type Props = {
  onKey: (key: RemoteKey) => void;
  onSettings: () => void;
  connected: boolean;
};

export const RemoteLayout: React.FC<Props> = ({ onKey, onSettings, connected }) => {
  const [numPad, setNumPad] = useState(false);

  return (
    <View style={styles.container}>
      {/* Top row: settings + dot ... power */}
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <Pressable
            style={({ pressed }) => [styles.gearBtn, pressed && styles.gearPressed]}
            onPress={onSettings}
            hitSlop={8}
          >
            <AppIcon name="cog" size={22} color={theme.colors.textSecondary} />
          </Pressable>
          <View style={[styles.statusDot, connected ? styles.dotConnected : styles.dotDisconnected]} />
        </View>
        <Pressable
          style={({ pressed }) => [styles.powerBtn, pressed && styles.powerPressed]}
          onPress={() => onKey("power")}
        >
          <AppIcon name="power" size={26} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Center: D-Pad or Number Pad */}
      <View style={styles.center}>
        {numPad ? (
          <View style={styles.numPad}>
            {[["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]].map((row, ri) => (
              <View key={ri} style={styles.numRow}>
                {row.map((n) => (
                  <Pressable
                    key={n}
                    style={({ pressed }) => [styles.numBtn, pressed && styles.numBtnPressed]}
                    onPress={() => onKey(`num_${n}` as RemoteKey)}
                  >
                    <Text style={styles.numText}>{n}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
            <View style={styles.numRow}>
              <View style={styles.numSpacer} />
              <Pressable
                style={({ pressed }) => [styles.numBtn, pressed && styles.numBtnPressed]}
                onPress={() => onKey("num_0")}
              >
                <Text style={styles.numText}>0</Text>
              </Pressable>
              <View style={styles.numSpacer} />
            </View>
          </View>
        ) : (
          <DPad onKey={onKey} />
        )}
      </View>

      {/* Nav row: Back | 1 2 3 | D-Pad | Home */}
      <View style={styles.navRow}>
        <Pressable
          style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
          onPress={() => onKey("back")}
        >
          <AppIcon name="arrow-left" size={24} color={theme.colors.text} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.navBtn,
            numPad && styles.navBtnActive,
            pressed && styles.navBtnPressed,
          ]}
          onPress={() => setNumPad(true)}
        >
          <Text style={[styles.navLabel, numPad && styles.navLabelActive]}>1 2 3</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.navBtn,
            !numPad && styles.navBtnActive,
            pressed && styles.navBtnPressed,
          ]}
          onPress={() => setNumPad(false)}
        >
          <Text style={[styles.navLabel, !numPad && styles.navLabelActive]}>D-Pad</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
          onPress={() => onKey("home")}
        >
          <AppIcon name="home-outline" size={24} color={theme.colors.text} />
        </Pressable>
      </View>

      {/* Bottom: CH | center controls | VOL */}
      <View style={styles.bottom}>
        {/* Channel column */}
        <View style={styles.sideCol}>
          <Pressable
            style={({ pressed }) => [styles.sideBtn, pressed && styles.sideBtnPressed]}
            onPress={() => onKey("channel_up")}
          >
            <AppIcon name="chevron-up" size={24} color={theme.colors.warning} />
          </Pressable>
          <Text style={styles.sideLabel}>CH</Text>
          <Pressable
            style={({ pressed }) => [styles.sideBtn, pressed && styles.sideBtnPressed]}
            onPress={() => onKey("channel_down")}
          >
            <AppIcon name="chevron-down" size={24} color={theme.colors.warning} />
          </Pressable>
        </View>

        {/* Center controls */}
        <View style={styles.centerCol}>
          <View style={styles.ctrlRow}>
            <Pressable
              style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}
              onPress={() => onKey("input")}
            >
              <Text style={styles.ctrlText}>INPUT</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}
              onPress={() => onKey("guide")}
            >
              <Text style={styles.ctrlText}>GUIDE</Text>
            </Pressable>
          </View>
          <View style={styles.ctrlRow}>
            <Pressable
              style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}
              onPress={() => onKey("menu")}
            >
              <AppIcon name="menu" size={20} color={theme.colors.text} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}
              onPress={() => onKey("mute")}
            >
              <AppIcon name="volume-off" size={20} color={theme.colors.text} />
            </Pressable>
          </View>
          <View style={styles.ctrlRow}>
            <Pressable
              style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}
              onPress={() => onKey("rewind")}
            >
              <AppIcon name="rewind" size={22} color={theme.colors.text} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}
              onPress={() => onKey("play")}
            >
              <AppIcon name="play-pause" size={22} color={theme.colors.text} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}
              onPress={() => onKey("forward")}
            >
              <AppIcon name="fast-forward" size={22} color={theme.colors.text} />
            </Pressable>
          </View>
        </View>

        {/* Volume column */}
        <View style={styles.sideCol}>
          <Pressable
            style={({ pressed }) => [styles.sideBtn, pressed && styles.sideBtnPressed]}
            onPress={() => onKey("volume_up")}
          >
            <AppIcon name="chevron-up" size={24} color={theme.colors.warning} />
          </Pressable>
          <Text style={styles.sideLabel}>VOL</Text>
          <Pressable
            style={({ pressed }) => [styles.sideBtn, pressed && styles.sideBtnPressed]}
            onPress={() => onKey("volume_down")}
          >
            <AppIcon name="chevron-down" size={24} color={theme.colors.warning} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 0,
  },
  topLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  gearBtn: {
    padding: 6,
  },
  gearPressed: {
    opacity: 0.6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotConnected: {
    backgroundColor: theme.colors.success,
  },
  dotDisconnected: {
    backgroundColor: theme.colors.danger,
  },
  powerBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  powerPressed: {
    opacity: 0.7,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  numPad: {
    gap: 6,
    alignItems: "center",
  },
  numRow: {
    flexDirection: "row",
    gap: 6,
  },
  numBtn: {
    width: 74,
    height: 54,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  numBtnPressed: {
    backgroundColor: theme.colors.surfacePressed,
  },
  numSpacer: {
    width: 74,
    height: 54,
  },
  numText: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
  },

  navRow: {
    flexDirection: "row",
    gap: 6,
    marginVertical: 6,
  },
  navBtn: {
    flex: 1,
    height: 44,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  navBtnPressed: {
    backgroundColor: theme.colors.surfacePressed,
  },
  navBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  navLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  navLabelActive: {
    color: theme.colors.text,
  },

  bottom: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 4,
  },
  sideCol: {
    width: 50,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  sideBtn: {
    width: 48,
    height: 44,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  sideBtnPressed: {
    backgroundColor: theme.colors.surfacePressed,
  },
  sideLabel: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    marginVertical: 1,
  },
  centerCol: {
    flex: 1,
    gap: 6,
  },
  ctrlRow: {
    flexDirection: "row",
    gap: 6,
  },
  ctrlBtn: {
    flex: 1,
    height: 40,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  ctrlBtnPressed: {
    backgroundColor: theme.colors.surfacePressed,
  },
  ctrlText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
});
