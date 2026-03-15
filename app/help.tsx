import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTV } from "@/hooks/useTV";
import { theme } from "@/theme";

const helpByBrand: Record<string, string[]> = {
  roku: [
    "Settings > System > Advanced system settings > Control by mobile apps > Network access = Default/Permissive.",
    "Keep Roku awake while pairing and first command test.",
    "If commands lag, reboot Roku once and reconnect."
  ],
  samsung: [
    "Keep TV on same WiFi and accept the on-screen Allow prompt.",
    "If prompt does not appear, toggle mobile remote/IP remote setting and retry.",
    "Power-cycle TV after major firmware updates."
  ],
  lg: [
    "Enable LG Connect Apps in TV settings.",
    "Accept the connection prompt on TV for first pair.",
    "If d-pad fails, reconnect once to refresh pointer socket."
  ],
  sony: [
    "Settings > Network & Internet > Home Network > IP Control.",
    "Authentication = Normal and Pre-Shared Key.",
    "Set Pre-Shared Key to 0000 and enable Remote Start."
  ],
  vizio: [
    "Start pairing from app and enter PIN quickly before expiry.",
    "If token expires, re-pair from Add TV or reconnect flow.",
    "Keep TV awake during pairing."
  ],
  androidtv: [
    "Keep device awake and connected to same WiFi.",
    "Enter 6-digit pairing code shown on TV.",
    "If code never appears, restart Google TV Remote Service (or reboot TV)."
  ],
  firetv: [
    "Settings > My Fire TV > Developer Options > ADB Debugging = ON.",
    "Approve pairing prompt on screen (Always allow recommended).",
    "If pairing fails, toggle ADB Debugging off/on and retry."
  ],
  ir: [
    "Point phone at TV sensor with clear line of sight.",
    "Try brand-specific IR profile if Universal misses commands.",
    "Keep distance short for first tests."
  ]
};

export default function HelpScreen() {
  const { tvs, connectToSavedTV, recoverSavedTV, wakeTV } = useTV();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Fix My TV (Advanced)</Text>
        <Text style={styles.subtitle}>
          Hidden diagnostics: use only when normal reconnect fails.
        </Text>

        {tvs.length === 0 ? (
          <Text style={styles.empty}>No saved TVs to diagnose yet.</Text>
        ) : (
          tvs.map((tv) => (
            <View key={tv.id} style={styles.card}>
              <Text style={styles.cardTitle}>{tv.name}</Text>
              <Text style={styles.cardMeta}>
                {tv.brand.toUpperCase()} · {tv.ip}
              </Text>
              <View style={styles.buttonRow}>
                <Pressable style={styles.btn} onPress={() => connectToSavedTV(tv.id)}>
                  <Text style={styles.btnText}>Reconnect</Text>
                </Pressable>
                <Pressable style={styles.btn} onPress={() => recoverSavedTV(tv.id)}>
                  <Text style={styles.btnText}>Smart Recover</Text>
                </Pressable>
                <Pressable style={styles.btn} onPress={() => wakeTV(tv.id)}>
                  <Text style={styles.btnText}>Wake</Text>
                </Pressable>
              </View>

              <Text style={styles.stepsTitle}>Brand checklist</Text>
              {helpByBrand[tv.brand].map((step, idx) => (
                <Text key={`${tv.id}-${idx}`} style={styles.stepText}>
                  {idx + 1}. {step}
                </Text>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.md
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "800"
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13
  },
  empty: {
    color: theme.colors.textSecondary
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm
  },
  cardTitle: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 16
  },
  cardMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  btn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  btnText: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 12
  },
  stepsTitle: {
    color: theme.colors.text,
    fontWeight: "700",
    marginTop: 4
  },
  stepText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17
  }
});
