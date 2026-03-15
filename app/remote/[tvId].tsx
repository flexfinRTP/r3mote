import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RemoteKey, StreamingApp } from "@/adapters";
import { RemoteLayout } from "@/components/RemoteLayout";
import { useHaptics } from "@/hooks/useHaptics";
import { useTV } from "@/hooks/useTV";
import { theme } from "@/theme";

export default function RemoteScreen() {
  const router = useRouter();
  const { tvId } = useLocalSearchParams<{ tvId: string }>();
  const {
    tvs,
    activeTv,
    canSendText,
    canLaunchApps,
    connectToSavedTV,
    sendKey,
    sendText,
    launchStreamingApp,
    disconnect,
    connecting,
    statusMessage,
  } = useTV();
  const haptics = useHaptics();
  const [sending, setSending] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [textDraft, setTextDraft] = useState("");

  const tv = useMemo(
    () => tvs.find((item) => item.id === tvId) ?? activeTv ?? null,
    [activeTv, tvId, tvs]
  );

  useEffect(() => {
    const run = async () => {
      if (!tvId) return;
      if (activeTv?.id === tvId) return;
      await connectToSavedTV(tvId);
    };
    run();
  }, [activeTv?.id, connectToSavedTV, tvId]);

  const reconnect = async () => {
    if (!tv) return;
    await connectToSavedTV(tv.id);
  };

  const handleKey = async (key: RemoteKey) => {
    if (!tv) return;
    if (sending) return;
    setSending(true);
    try {
      await haptics.tap();
      await sendKey(key);
    } catch (err) {
      await haptics.error();
      Alert.alert(
        "Command failed",
        err instanceof Error ? err.message : "Unable to send key.",
        [
          { text: "Close", style: "cancel" },
          { text: "Reconnect TV", onPress: reconnect },
        ]
      );
    } finally {
      setSending(false);
    }
  };

  const handleSendText = async () => {
    if (!textDraft.trim()) return;
    if (sending) return;
    setSending(true);
    try {
      await haptics.tap();
      await sendText(textDraft.trim());
      setTextOpen(false);
      setTextDraft("");
    } catch (err) {
      await haptics.error();
      Alert.alert(
        "Text input failed",
        err instanceof Error ? err.message : "Unable to send text."
      );
    } finally {
      setSending(false);
    }
  };

  const handleLaunchApp = async (app: StreamingApp) => {
    if (sending) return;
    setSending(true);
    try {
      await haptics.tap();
      await launchStreamingApp(app);
    } catch (err) {
      await haptics.error();
      Alert.alert(
        "App launch failed",
        err instanceof Error ? err.message : "Unable to launch app."
      );
    } finally {
      setSending(false);
    }
  };

  const handleSettings = () => {
    if (!tv) return;
    Alert.alert(
      tv.name,
      `${tv.brand.toUpperCase()} • ${tv.ip}${statusMessage ? `\n\n${statusMessage}` : ""}`,
      [
        { text: "Reconnect", onPress: reconnect },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            await disconnect();
            router.replace("/");
          },
        },
        { text: "Close", style: "cancel" },
      ]
    );
  };

  if (!tv) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <RemoteLayout
          onKey={() => {}}
          onSettings={() => router.replace("/")}
          connected={false}
        />
      </SafeAreaView>
    );
  }

  const isConnected = activeTv?.id === tvId && !connecting;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {(canSendText || canLaunchApps) && (
        <View style={styles.quickBar}>
          {canSendText ? (
            <Pressable
              style={({ pressed }) => [styles.quickBtn, pressed && styles.quickBtnPressed]}
              onPress={() => setTextOpen(true)}
            >
              <Text style={styles.quickBtnText}>Keyboard</Text>
            </Pressable>
          ) : null}
          {canLaunchApps ? (
            <>
              <Pressable
                style={({ pressed }) => [styles.quickBtn, pressed && styles.quickBtnPressed]}
                onPress={() => handleLaunchApp("netflix")}
              >
                <Text style={styles.quickBtnText}>Netflix</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.quickBtn, pressed && styles.quickBtnPressed]}
                onPress={() => handleLaunchApp("disney")}
              >
                <Text style={styles.quickBtnText}>Disney+</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.quickBtn, pressed && styles.quickBtnPressed]}
                onPress={() => handleLaunchApp("prime")}
              >
                <Text style={styles.quickBtnText}>Prime</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      )}
      <RemoteLayout
        onKey={handleKey}
        onSettings={handleSettings}
        connected={isConnected}
      />

      <Modal
        visible={textOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setTextOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Type on phone</Text>
            <Text style={styles.modalCopy}>
              Sends text to the active TV search/login field.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Search text..."
              placeholderTextColor={theme.colors.textSecondary}
              value={textDraft}
              onChangeText={setTextDraft}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setTextOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.sendBtn} onPress={handleSendText}>
                <Text style={styles.sendText}>{sending ? "Sending..." : "Send"}</Text>
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
    backgroundColor: theme.colors.background,
  },
  quickBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  quickBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickBtnPressed: {
    backgroundColor: theme.colors.surfacePressed,
  },
  quickBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
    fontSize: 11,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: theme.spacing.md,
  },
  modal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  modalCopy: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: theme.spacing.sm,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
  },
  sendBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  sendText: {
    color: theme.colors.text,
    fontWeight: "800",
  },
});
