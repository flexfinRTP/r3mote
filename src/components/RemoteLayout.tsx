import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { RemoteKey } from "@/adapters";
import { theme } from "@/theme";
import { DPad } from "./DPad";
import { MediaControls } from "./MediaControls";
import { PowerButton } from "./PowerButton";
import { RemoteButton } from "./RemoteButton";
import { VolumeBar } from "./VolumeBar";

type Props = {
  tvName: string;
  onKey: (key: RemoteKey) => void;
  showNumberPad: boolean;
};

const numbers: RemoteKey[] = [
  "num_1",
  "num_2",
  "num_3",
  "num_4",
  "num_5",
  "num_6",
  "num_7",
  "num_8",
  "num_9",
  "num_0"
];

export const RemoteLayout: React.FC<Props> = ({ tvName, onKey, showNumberPad }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{tvName}</Text>
        <PowerButton onKey={onKey} />
      </View>

      <RemoteButton label="INPUT" onPress={() => onKey("input")} />

      <DPad onKey={onKey} />

      <View style={styles.row}>
        <RemoteButton label="BACK" onPress={() => onKey("back")} style={styles.half} />
        <RemoteButton label="HOME" onPress={() => onKey("home")} style={styles.half} />
      </View>
      <View style={styles.row}>
        <RemoteButton label="MENU" onPress={() => onKey("menu")} style={styles.half} />
        <RemoteButton label="GUIDE" onPress={() => onKey("guide")} style={styles.half} />
      </View>

      <MediaControls onKey={onKey} />
      <VolumeBar onKey={onKey} />

      {showNumberPad ? (
        <View style={styles.numberGrid}>
          {numbers.map((n, index) => (
            <RemoteButton
              key={n}
              label={index === 9 ? "0" : String(index + 1)}
              onPress={() => onKey(n)}
              style={styles.number}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700"
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  half: {
    flex: 1
  },
  numberGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  number: {
    width: "31%"
  }
});
