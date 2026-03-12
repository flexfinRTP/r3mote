import React from "react";
import { StyleSheet, View } from "react-native";
import type { RemoteKey } from "@/adapters";
import { theme } from "@/theme";
import { RemoteButton } from "./RemoteButton";

type Props = {
  onKey: (key: RemoteKey) => void;
};

export const DPad: React.FC<Props> = ({ onKey }) => {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <RemoteButton label="▲" onPress={() => onKey("up")} style={styles.dir} />
      </View>
      <View style={styles.row}>
        <RemoteButton label="◀" onPress={() => onKey("left")} style={styles.dir} />
        <RemoteButton label="OK" onPress={() => onKey("select")} style={styles.ok} />
        <RemoteButton label="▶" onPress={() => onKey("right")} style={styles.dir} />
      </View>
      <View style={styles.row}>
        <RemoteButton label="▼" onPress={() => onKey("down")} style={styles.dir} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: theme.spacing.sm,
    alignItems: "center"
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  dir: {
    width: 80,
    height: 64
  },
  ok: {
    width: 96,
    height: 64
  }
});
