import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTV } from "@/hooks/useTV";
import { theme } from "@/theme";

const launchOptions: Array<{
  id: "home" | "last" | "favorite" | "startup_tv";
  label: string;
}> = [
  { id: "home", label: "Home" },
  { id: "last", label: "Last TV" },
  { id: "favorite", label: "Favorite" },
  { id: "startup_tv", label: "Startup TV" }
];

export default function SettingsScreen() {
  const router = useRouter();
  const {
    tvs,
    settings,
    updateSettings,
    renameTV,
    toggleFavoriteTV,
    setStartupTV,
    setTVMac,
    forgetTV
  } = useTV();

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [macOpen, setMacOpen] = useState(false);
  const [macId, setMacId] = useState<string | null>(null);
  const [macValue, setMacValue] = useState("");

  const orderedTVs = useMemo(
    () =>
      [...tvs].sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return b.lastSeen - a.lastSeen;
      }),
    [tvs]
  );

  const openRename = (id: string, currentName: string) => {
    setRenameId(id);
    setRenameValue(currentName);
    setRenameOpen(true);
  };

  const openMac = (id: string, currentMac?: string) => {
    setMacId(id);
    setMacValue(currentMac ?? "");
    setMacOpen(true);
  };

  const submitRename = async () => {
    if (!renameId || !renameValue.trim()) return;
    await renameTV(renameId, renameValue.trim());
    setRenameOpen(false);
  };

  const submitMac = async () => {
    if (!macId || !macValue.trim()) return;
    await setTVMac(macId, macValue.trim());
    setMacOpen(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Saved TVs</Text>
        {orderedTVs.length === 0 ? (
          <Text style={styles.empty}>No saved TVs yet.</Text>
        ) : (
          orderedTVs.map((tv) => {
            const startup = settings.startupTvId === tv.id;
            return (
              <View key={tv.id} style={styles.tvRow}>
                <View style={styles.tvMeta}>
                  <Text style={styles.tvName}>
                    {tv.favorite ? "★ " : ""}
                    {tv.name}
                    {startup ? "  [Startup]" : ""}
                  </Text>
                  <Text style={styles.tvSub}>
                    {tv.brand.toUpperCase()} · {tv.ip}
                  </Text>
                  {tv.mac ? <Text style={styles.tvSub}>Wake MAC: {tv.mac}</Text> : null}
                </View>
                <View style={styles.tvActions}>
                  <Pressable
                    style={[styles.smallBtn, tv.favorite && styles.smallBtnActive]}
                    onPress={() => toggleFavoriteTV(tv.id)}
                  >
                    <Text style={styles.smallBtnText}>{tv.favorite ? "Unstar" : "Star"}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.smallBtn, startup && styles.smallBtnActive]}
                    onPress={() => setStartupTV(startup ? null : tv.id)}
                  >
                    <Text style={styles.smallBtnText}>{startup ? "Unset" : "Startup"}</Text>
                  </Pressable>
                  <Pressable style={styles.smallBtn} onPress={() => openRename(tv.id, tv.name)}>
                    <Text style={styles.smallBtnText}>Rename</Text>
                  </Pressable>
                  <Pressable style={styles.smallBtn} onPress={() => openMac(tv.id, tv.mac)}>
                    <Text style={styles.smallBtnText}>MAC</Text>
                  </Pressable>
                  <Pressable style={styles.smallDangerBtn} onPress={() => forgetTV(tv.id)}>
                    <Text style={styles.smallBtnText}>Forget</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.sectionTitle}>Launch Behavior</Text>
        <View style={styles.launchWrap}>
          {launchOptions.map((option) => (
            <Pressable
              key={option.id}
              style={[
                styles.launchPill,
                settings.launchTarget === option.id && styles.launchPillActive
              ]}
              onPress={() => updateSettings({ launchTarget: option.id })}
            >
              <Text style={styles.launchPillText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        {settings.launchTarget === "startup_tv" && !settings.startupTvId ? (
          <Text style={styles.help}>
            Pick a TV and tap "Startup" above, or switch launch behavior.
          </Text>
        ) : null}

        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.prefRow}>
          <Text style={styles.prefText}>Haptic Feedback</Text>
          <Switch
            value={settings.hapticFeedback}
            onValueChange={(v) => updateSettings({ hapticFeedback: v })}
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
          />
        </View>
        <View style={styles.prefRow}>
          <Text style={styles.prefText}>Show Number Pad</Text>
          <Switch
            value={settings.showNumberPad}
            onValueChange={(v) => updateSettings({ showNumberPad: v })}
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
          />
        </View>
        <View style={styles.prefRow}>
          <Text style={styles.prefText}>Large Buttons</Text>
          <Switch
            value={settings.buttonSize === "large"}
            onValueChange={(v) => updateSettings({ buttonSize: v ? "large" : "normal" })}
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
          />
        </View>

        <Pressable style={styles.helpLink} onPress={() => router.push("/help" as never)}>
          <Text style={styles.helpLinkText}>Advanced Help & Diagnostics</Text>
        </Pressable>

        <Text style={styles.about}>R3mote v1.0.0 - Local ad-free family TV remote.</Text>
      </ScrollView>

      <Modal
        visible={renameOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Rename TV</Text>
            <TextInput
              style={styles.input}
              placeholder="TV name"
              placeholderTextColor={theme.colors.textSecondary}
              value={renameValue}
              onChangeText={setRenameValue}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setRenameOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={submitRename}>
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={macOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMacOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Wake MAC Address</Text>
            <Text style={styles.help}>Example: AA:BB:CC:DD:EE:FF</Text>
            <TextInput
              style={styles.input}
              placeholder="AA:BB:CC:DD:EE:FF"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="characters"
              value={macValue}
              onChangeText={setMacValue}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setMacOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={submitMac}>
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginTop: theme.spacing.sm
  },
  empty: {
    color: theme.colors.textSecondary
  },
  tvRow: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm
  },
  tvMeta: {
    flexShrink: 1
  },
  tvName: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 16
  },
  tvSub: {
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontSize: 12
  },
  tvActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  smallBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6
  },
  smallBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  smallDangerBtn: {
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6
  },
  smallBtnText: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 12
  },
  launchWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  launchPill: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.round,
    paddingVertical: 6,
    paddingHorizontal: 10
  },
  launchPillActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary
  },
  launchPillText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "700"
  },
  help: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17
  },
  prefRow: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  prefText: {
    color: theme.colors.text,
    fontWeight: "700"
  },
  helpLink: {
    marginTop: theme.spacing.lg,
    alignSelf: "center"
  },
  helpLinkText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textDecorationLine: "underline"
  },
  about: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    textAlign: "center"
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: theme.spacing.md
  },
  modal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "800"
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: theme.spacing.sm
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontWeight: "700"
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  saveText: {
    color: theme.colors.text,
    fontWeight: "800"
  }
});
