import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { TVBrand } from "@/adapters";
import { checkIRAvailable } from "@/adapters/ir";
import { TVCard } from "@/components/TVCard";
import { IR_BRAND_KEYS, IR_BRAND_LABELS, type IRBrandKey } from "@/data/irCodes";
import { useDiscovery } from "@/hooks/useDiscovery";
import { useTV } from "@/hooks/useTV";
import { theme } from "@/theme";

const wifiBrandOptions: TVBrand[] = [
  "roku",
  "samsung",
  "lg",
  "sony",
  "vizio",
  "androidtv",
  "firetv",
];

const manualBrandHelp: Record<TVBrand, string> = {
  roku: "Roku: just tap Connect. No setup needed.",
  samsung: "Samsung: tap Connect, then press Allow on your TV when prompted.",
  lg: "LG: tap Connect, then press Accept on your TV when prompted.",
  sony: "Sony: tap Connect to auto-pair. If it fails, set up your TV first:\n1. Settings → Network & Internet → Home Network → IP Control\n2. Authentication → Normal and Pre-Shared Key\n3. Pre-Shared Key → set to 0000\n4. Enable Remote Start (in Network & Internet menu)\nThen enter 0000 as the Pre-Shared Key below and tap Connect.",
  vizio: "Vizio: tap Connect. TV will show a PIN — enter it here.",
  androidtv: "Android TV: tap Connect. TV will show a code — enter it here.",
  firetv: "Fire TV: enable ADB Debugging in Settings > Developer Options, then tap Connect.",
  ir: "IR Blaster: uses your phone's built-in infrared. Point phone at TV. Android only.",
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    hydrated,
    tvs,
    settings,
    connecting,
    statusMessage,
    clearStatus,
    cancelPairing,
    pairingPrompt,
    submitPairingCode,
    addOrConnectManualTV,
    connectToSavedTV,
    bootstrapScanRequested,
    consumeBootstrapScanRequest,
  } = useTV();
  const { devices, loading, error, lastScanSummary, scanProgress, scan } =
    useDiscovery();

  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualBrand, setManualBrand] = useState<TVBrand>("roku");
  const [manualIp, setManualIp] = useState("");
  const [manualIrBrand, setManualIrBrand] = useState<IRBrandKey>("universal");
  const [manualPsk, setManualPsk] = useState("");
  const [hasIR, setHasIR] = useState(false);
  const [pairingCode, setPairingCode] = useState("");

  useEffect(() => {
    if (!hydrated || !bootstrapScanRequested) return;
    let cancelled = false;

    const resolveStartupTV = () => {
      if (settings.launchTarget === "home") return null;
      if (settings.launchTarget === "startup_tv" && settings.startupTvId) {
        return tvs.find((tv) => tv.id === settings.startupTvId) ?? null;
      }
      if (settings.launchTarget === "favorite") {
        return tvs.find((tv) => tv.favorite) ?? null;
      }
      if (settings.launchTarget === "last" && settings.lastTvId) {
        return tvs.find((tv) => tv.id === settings.lastTvId) ?? null;
      }
      return null;
    };

    const run = async () => {
      const startupTV = resolveStartupTV();
      if (startupTV) {
        const connected = await connectToSavedTV(startupTV.id);
        if (connected && !cancelled) {
          consumeBootstrapScanRequest();
          router.replace(`/remote/${connected.id}` as never);
          return;
        }
      }
      if (!cancelled) {
        scan();
        consumeBootstrapScanRequest();
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [
    hydrated,
    bootstrapScanRequested,
    connectToSavedTV,
    consumeBootstrapScanRequest,
    router,
    scan,
    settings.lastTvId,
    settings.launchTarget,
    settings.startupTvId,
    tvs
  ]);

  useEffect(() => {
    if (Platform.OS === "android") {
      checkIRAvailable().then(setHasIR);
    }
  }, []);

  const knownDevices = useMemo(() => {
    const savedByBrandIp = new Map(
      tvs.map((tv) => [`${tv.brand}:${tv.ip.trim()}`, tv] as const)
    );

    return [...devices]
      .map((device) => {
        const saved = savedByBrandIp.get(`${device.brand}:${device.ip.trim()}`);
        return {
          ...device,
          favorite: Boolean(saved?.favorite),
          startup: Boolean(saved && settings.startupTvId === saved.id),
        };
      })
      .sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        if (a.startup !== b.startup) return a.startup ? -1 : 1;
        if (a.online !== b.online) return a.online ? -1 : 1;
        return b.lastSeen - a.lastSeen;
      });
  }, [devices, settings.startupTvId, tvs]);

  const handleConnectResult = (tvId: string | null) => {
    if (!tvId) return;
    router.push(`/remote/${tvId}` as never);
  };

  const onDevicePress = async (device: (typeof knownDevices)[number]) => {
    if (connecting) return;

    const existing = tvs.find(
      (tv) => tv.brand === device.brand && tv.ip.trim() === device.ip.trim()
    );

    if (existing) {
      const connected = await connectToSavedTV(existing.id);
      handleConnectResult(connected?.id ?? null);
      return;
    }

    // Auto-connect for scanned online TVs — no modal needed
    if (device.online && device.brand !== "ir") {
      const connected = await addOrConnectManualTV({
        name: device.name,
        brand: device.brand,
        ip: device.ip,
      });
      if (connected) {
        handleConnectResult(connected.id);
      }
      // If connect failed and needs pairing, the pairing modal pops up automatically
      return;
    }

    // Offline or IR — open manual add modal
    setManualName(device.name);
    setManualBrand(device.brand);
    setManualIp(device.ip);
    setManualOpen(true);
  };

  const submitManual = async () => {
    if (connecting) return;
    if (manualBrand !== "ir" && !manualIp.trim()) {
      Alert.alert("Missing IP", "Please enter a valid TV IP address.");
      return;
    }
    const connected = await addOrConnectManualTV({
      name:
        manualName.trim() ||
        (manualBrand === "ir"
          ? `IR - ${IR_BRAND_LABELS[manualIrBrand]}`
          : `${manualBrand.toUpperCase()} TV`),
      brand: manualBrand,
      ip: manualBrand === "ir" ? "ir-local" : manualIp.trim(),
      psk: manualPsk.trim() || undefined,
      irBrand: manualBrand === "ir" ? manualIrBrand : undefined,
    });
    if (connected) {
      setManualOpen(false);
      handleConnectResult(connected.id);
    }
  };

  const submitCode = async () => {
    if (connecting) return;
    if (!pairingCode.trim()) return;
    const connected = await submitPairingCode(pairingCode.trim());
    if (connected) {
      setPairingCode("");
      handleConnectResult(connected.id);
    }
  };

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={theme.colors.text} />
      </SafeAreaView>
    );
  }

  const allBrandOptions: TVBrand[] = hasIR
    ? [...wifiBrandOptions, "ir"]
    : wifiBrandOptions;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>R3mote</Text>
        <View style={styles.actions}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push("/settings" as never)}
          >
            <Text style={styles.actionText}>Settings</Text>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={scan}
            disabled={loading || connecting}
          >
            <Text style={styles.actionText}>
              {loading ? "Scanning..." : "Scan"}
            </Text>
          </Pressable>
        </View>
      </View>

      {loading && scanProgress > 0 ? (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${scanProgress}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            Scanning network... {scanProgress}%
          </Text>
        </View>
      ) : null}

      {statusMessage ? (
        <Pressable style={styles.banner} onPress={clearStatus}>
          <Text style={styles.bannerText}>{statusMessage}</Text>
        </Pressable>
      ) : null}
      {lastScanSummary && !loading ? (
        <View style={styles.bannerInfo}>
          <Text style={styles.bannerInfoText}>{lastScanSummary}</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={knownDevices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: 140 + insets.bottom }]}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading
              ? "Searching for TVs on your network..."
              : "No TVs found yet. Tap Scan or Add TV manually."}
          </Text>
        }
        renderItem={({ item }) => (
          <TVCard
            item={item}
            isFavorite={item.favorite}
            isStartup={item.startup}
            onPress={() => onDevicePress(item)}
          />
        )}
      />

      <Pressable
        style={[styles.addBtn, { bottom: Math.max(theme.spacing.lg, insets.bottom + 10) }, connecting && styles.disabled]}
        disabled={connecting}
        onPress={() => {
          setManualName("");
          setManualBrand("roku");
          setManualIp("");
          setManualIrBrand("universal");
          setManualPsk("");
          setManualOpen(true);
        }}
      >
        <Text style={styles.addBtnText}>+ Add TV Manually</Text>
      </Pressable>

      {/* Manual Add Modal */}
      <Modal
        visible={manualOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setManualOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Add TV</Text>

              <TextInput
                style={styles.input}
                placeholder="Name (e.g. Living Room TV)"
                placeholderTextColor={theme.colors.textSecondary}
                value={manualName}
                onChangeText={setManualName}
              />

              {manualBrand !== "ir" ? (
                <TextInput
                  style={styles.input}
                  placeholder="TV IP Address (e.g. 192.168.1.50)"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                  value={manualIp}
                  onChangeText={setManualIp}
                />
              ) : null}

              <Text style={styles.sectionLabel}>Connection Type</Text>
              <View style={styles.brandWrap}>
                {allBrandOptions.map((brand) => (
                  <Pressable
                    key={brand}
                    style={[
                      styles.brandPill,
                      manualBrand === brand && styles.brandPillSelected,
                    ]}
                    onPress={() => setManualBrand(brand)}
                  >
                    <Text style={styles.brandPillText}>
                      {brand === "ir" ? "IR BLASTER" : brand.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.helpText}>{manualBrandHelp[manualBrand]}</Text>

              {manualBrand === "sony" ? (
                <TextInput
                  style={styles.input}
                  placeholder='Pre-Shared Key (try "0000" if unsure)'
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  value={manualPsk}
                  onChangeText={setManualPsk}
                />
              ) : null}

              {manualBrand === "ir" ? (
                <>
                  <Text style={styles.sectionLabel}>TV Brand (for IR codes)</Text>
                  <View style={styles.brandWrap}>
                    {IR_BRAND_KEYS.map((irKey) => (
                      <Pressable
                        key={irKey}
                        style={[
                          styles.brandPill,
                          manualIrBrand === irKey && styles.brandPillSelected,
                        ]}
                        onPress={() => setManualIrBrand(irKey)}
                      >
                        <Text style={styles.brandPillText}>
                          {IR_BRAND_LABELS[irKey]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => setManualOpen(false)}
                >
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryBtn, connecting && styles.disabled]}
                  disabled={connecting}
                  onPress={submitManual}
                >
                  <Text style={styles.primaryBtnText}>
                    {connecting ? "Connecting..." : "Connect"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Pairing Code Modal */}
      <Modal
        visible={Boolean(pairingPrompt)}
        animationType="fade"
        transparent
        onRequestClose={cancelPairing}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{pairingPrompt?.title}</Text>
            <Text style={styles.modalMessage}>{pairingPrompt?.message}</Text>
            <TextInput
              style={styles.input}
              placeholder={
                pairingPrompt?.kind === "pin"
                  ? "Enter PIN from TV"
                  : pairingPrompt?.kind === "secret"
                    ? "Enter code from TV"
                    : "Enter code"
              }
              placeholderTextColor={theme.colors.textSecondary}
              value={pairingCode}
              onChangeText={setPairingCode}
              keyboardType="number-pad"
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryBtn} onPress={cancelPairing}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryBtn, connecting && styles.disabled]}
                disabled={connecting}
                onPress={submitCode}
              >
                <Text style={styles.primaryBtnText}>
                  {connecting ? "Submitting..." : "Submit"}
                </Text>
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
    paddingHorizontal: theme.spacing.md,
  },
  centered: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  topBar: {
    paddingVertical: theme.spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heading: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  actionBtn: {
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  actionText: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  progressWrap: {
    marginBottom: theme.spacing.sm,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  progressText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  list: {
    gap: theme.spacing.sm,
    paddingBottom: 140,
  },
  empty: {
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 24,
  },
  addBtn: {
    position: "absolute",
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: "center",
  },
  addBtnText: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
  banner: {
    backgroundColor: theme.colors.surfacePressed,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  bannerText: {
    color: theme.colors.text,
    fontSize: 13,
  },
  bannerInfo: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  bannerInfoText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  error: {
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: theme.spacing.md,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  modal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  modalMessage: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  sectionLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  helpText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
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
  brandWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  brandPill: {
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  brandPillSelected: {
    backgroundColor: theme.colors.primary,
  },
  brandPillText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  modalActions: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: theme.spacing.sm,
  },
  secondaryBtn: {
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  secondaryBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
  },
  primaryBtn: {
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  primaryBtnText: {
    color: theme.colors.text,
    fontWeight: "800",
  },
});
