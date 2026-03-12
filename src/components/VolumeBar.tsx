import React from "react";
import { StyleSheet, View } from "react-native";
import type { RemoteKey } from "@/adapters";
import { theme } from "@/theme";
import { RemoteButton } from "./RemoteButton";

type Props = {
  onKey: (key: RemoteKey) => void;
};

export const VolumeBar: React.FC<Props> = ({ onKey }) => {
  return (
    <View style={styles.wrap}>
      <RemoteButton label="VOL -" onPress={() => onKey("volume_down")} style={styles.btn} />
      <RemoteButton label="MUTE" onPress={() => onKey("mute")} style={styles.btn} />
      <RemoteButton label="VOL +" onPress={() => onKey("volume_up")} style={styles.btn} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    width: "100%"
  },
  btn: {
    flex: 1
  }
});
