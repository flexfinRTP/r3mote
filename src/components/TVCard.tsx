import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DiscoveryDevice } from "@/discovery/types";
import { theme } from "@/theme";
import { AppIcon } from "./AppIcon";

type Props = {
  item: DiscoveryDevice;
  isFavorite?: boolean;
  isStartup?: boolean;
  onPress: () => void | Promise<void>;
};

export const TVCard: React.FC<Props> = ({ item, isFavorite, isStartup, onPress }) => {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.row}>
        <View
          style={[
            styles.dot,
            { backgroundColor: item.online ? theme.colors.success : theme.colors.textSecondary }
          ]}
        />
        <View style={styles.meta}>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.subtitle}>
            {item.brand.toUpperCase()} {item.model ? `· ${item.model}` : ""} · {item.ip}
          </Text>
        </View>
        {isFavorite ? (
          <AppIcon
            name="star"
            size={16}
            color={theme.colors.warning}
          />
        ) : null}
        {isStartup ? (
          <AppIcon
            name="rocket-launch"
            size={15}
            color={theme.colors.primary}
          />
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  pressed: {
    backgroundColor: theme.colors.surfacePressed
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999
  },
  meta: {
    flex: 1
  },
  title: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700"
  },
  subtitle: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: 12
  }
});
