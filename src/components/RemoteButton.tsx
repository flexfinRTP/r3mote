import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { theme } from "@/theme";

type Props = {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: "default" | "accent";
  style?: ViewStyle;
  disabled?: boolean;
};

export const RemoteButton: React.FC<Props> = ({
  label,
  onPress,
  variant = "default",
  style,
  disabled
}) => {
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === "accent" ? styles.accent : styles.default,
        pressed && !disabled ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined,
        style
      ]}
      onPress={onPress}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: theme.button.minHeight,
    minWidth: theme.button.minWidth,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  default: {
    backgroundColor: theme.colors.surface
  },
  accent: {
    backgroundColor: theme.colors.accent
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: theme.colors.surfacePressed
  },
  disabled: {
    opacity: 0.45
  },
  label: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 16
  }
});
