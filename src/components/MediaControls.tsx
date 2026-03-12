import React from "react";
import { StyleSheet, View } from "react-native";
import type { RemoteKey } from "@/adapters";
import { theme } from "@/theme";
import { RemoteButton } from "./RemoteButton";

type Props = {
  onKey: (key: RemoteKey) => void;
};

export const MediaControls: React.FC<Props> = ({ onKey }) => {
  return (
    <View style={styles.wrap}>
      <RemoteButton label="⏪" onPress={() => onKey("rewind")} style={styles.btn} />
      <RemoteButton label="⏯" onPress={() => onKey("play")} style={styles.btn} />
      <RemoteButton label="⏩" onPress={() => onKey("forward")} style={styles.btn} />
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
