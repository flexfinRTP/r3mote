import React, { useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { useTV } from "@/hooks/useTV";
import { theme } from "@/theme";

export default function SettingsScreen() {
  const { tvs, settings, updateSettings, renameTV, forgetTV } = useTV();
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const openRename = (id: string, currentName: string) => {
    setRenameId(id);
    setRenameValue(currentName);
    setRenameOpen(true);
  };

  const submitRename = async () => {
    if (!renameId || !renameValue.trim()) return;
    await renameTV(renameId, renameValue.trim());
    setRenameOpen(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Saved TVs</Text>
        {tvs.length === 0 ? (
          <Text style={styles.empty}>No saved TVs yet.</Text>
        ) : (
          tvs.map((tv) => (
            <View key={tv.id} style={styles.tvRow}>
              <View style={styles.tvMeta}>
                <Text style={styles.tvName}>{tv.name}</Text>
                <Text style={styles.tvSub}>
                  {tv.brand.toUpperCase()} · {tv.ip}
                </Text>
              </View>
              <View style={styles.tvActions}>
                <Pressable
                  style={styles.smallBtn}
                  onPress={() => openRename(tv.id, tv.name)}
                >
                  <Text style={styles.smallBtnText}>Rename</Text>
                </Pressable>
                <Pressable style={styles.smallDangerBtn} onPress={() => forgetTV(tv.id)}>
                  <Text style={styles.smallBtnText}>Forget</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

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

        <Text style={styles.about}>R3mote v1.0.0 - Local ad-free family TV remote.</Text>
      </ScrollView>

      <Modal visible={renameOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
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
        </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    marginTop: 2
  },
  tvActions: {
    flexDirection: "row",
    gap: theme.spacing.xs
  },
  smallBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6
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
  about: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg
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
