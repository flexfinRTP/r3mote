import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import type { RemoteKey } from "@/adapters";
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
    connectToSavedTV,
    sendKey,
    settings,
    disconnect,
    connecting,
    statusMessage
  } = useTV();
  const haptics = useHaptics();
  const [sending, setSending] = useState(false);

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
          { text: "Reconnect TV", onPress: reconnect }
        ]
      );
    } finally {
      setSending(false);
    }
  };

  if (!tv) {
    return (
      <SafeAreaView style={styles.emptyWrap}>
        <Text style={styles.emptyText}>TV not found.</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.connectionRow}>
          <Text style={styles.connectionText}>
            Connected to {tv.name} ({tv.brand.toUpperCase()})
          </Text>
          <View style={styles.connectionActions}>
            <Pressable
              style={styles.disconnectBtn}
              onPress={reconnect}
              disabled={connecting}
            >
              <Text style={styles.disconnectText}>{connecting ? "..." : "Reconnect"}</Text>
            </Pressable>
            <Pressable
              style={styles.disconnectBtn}
              onPress={async () => {
                await disconnect();
                router.replace("/");
              }}
            >
              <Text style={styles.disconnectText}>Disconnect</Text>
            </Pressable>
          </View>
        </View>
        {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}

        <RemoteLayout
          tvName={tv.name}
          onKey={handleKey}
          showNumberPad={settings.showNumberPad}
        />
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
  connectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm
  },
  connectionText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    flexShrink: 1,
    marginRight: theme.spacing.sm
  },
  disconnectBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6
  },
  connectionActions: {
    flexDirection: "row",
    gap: theme.spacing.xs
  },
  disconnectText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700"
  },
  statusText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: theme.spacing.xs
  },
  emptyWrap: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md
  },
  emptyText: {
    color: theme.colors.textSecondary
  },
  backBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  backBtnText: {
    color: theme.colors.text,
    fontWeight: "700"
  }
});
