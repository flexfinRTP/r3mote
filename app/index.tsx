import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import type { TVBrand } from "@/adapters";
import { TVCard } from "@/components/TVCard";
import { useDiscovery } from "@/hooks/useDiscovery";
import { useTV } from "@/hooks/useTV";
import { theme } from "@/theme";

const brandOptions: TVBrand[] = [
  "roku",
  "samsung",
  "lg",
  "sony",
  "vizio",
  "androidtv",
  "firetv"
];

const manualBrandHelp: Record<TVBrand, string> = {
  roku: "Roku: usually no setup. Just ensure phone and TV are on same WiFi.",
  samsung:
    "Samsung: on first connect, watch TV and press Allow when prompted.",
  lg: "LG: enable LG Connect Apps in TV settings, then accept prompt.",
  sony:
    "Sony: set IP Control + Pre-Shared Key on TV first, then enter same key here.",
  vizio: "Vizio: app will ask for on-screen TV PIN during pairing.",
  androidtv: "Android TV: app will ask for 6-digit code shown on TV.",
  firetv:
    "Fire TV: enable ADB Debugging in Developer Options, then pair with on-screen prompt."
};

export default function HomeScreen() {
  const router = useRouter();
  const {
    hydrated,
    tvs,
    connecting,
    statusMessage,
    clearStatus,
    pairingPrompt,
    submitPairingCode,
    addOrConnectManualTV,
    connectToSavedTV,
    bootstrapScanRequested,
    consumeBootstrapScanRequest
  } = useTV();
  const { devices, loading, error, scan } = useDiscovery();

  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualBrand, setManualBrand] = useState<TVBrand>("roku");
  const [manualIp, setManualIp] = useState("");
  const [manualPsk, setManualPsk] = useState("");

  const [pairingCode, setPairingCode] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (bootstrapScanRequested) {
      scan();
      consumeBootstrapScanRequest();
    }
  }, [hydrated, bootstrapScanRequested, consumeBootstrapScanRequest, scan]);

  const isReady = hydrated;

  const knownDevices = useMemo(() => devices, [devices]);

  const handleConnectResult = (tvId: string | null) => {
    if (!tvId) return;
    router.push(`/remote/${tvId}` as never);
  };

  const onDevicePress = async (device: (typeof knownDevices)[number]) => {
    const existing = tvs.find(
      (tv) => tv.brand === device.brand && tv.ip.trim() === device.ip.trim()
    );

    if (existing) {
      const connected = await connectToSavedTV(existing.id);
      handleConnectResult(connected?.id ?? null);
      return;
    }

    setManualName(device.name);
    setManualBrand(device.brand);
    setManualIp(device.ip);
    setManualPsk("");
    setManualOpen(true);
  };

  const submitManual = async () => {
    if (connecting) return;
    if (!manualIp.trim()) {
      Alert.alert("Missing IP", "Please enter a valid TV IP address.");
      return;
    }
    if (manualBrand === "sony" && !manualPsk.trim()) {
      Alert.alert("Sony key needed", "Please enter the Sony Pre-Shared Key.");
      return;
    }
    const connected = await addOrConnectManualTV({
      name: manualName.trim() || `${manualBrand.toUpperCase()} TV`,
      brand: manualBrand,
      ip: manualIp.trim(),
      psk: manualBrand === "sony" ? manualPsk.trim() : undefined
    });
    if (connected) {
      setManualOpen(false);
      handleConnectResult(connected.id);
    }
  };

  const submitCode = async () => {
    if (connecting) return;
    if (!pairingCode.trim()) {
      return;
    }
    const connected = await submitPairingCode(pairingCode.trim());
    if (connected) {
      setPairingCode("");
      handleConnectResult(connected.id);
    }
  };

  if (!isReady) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={theme.colors.text} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>R3mote</Text>
        <View style={styles.actions}>
          <Pressable style={styles.actionBtn} onPress={() => router.push("/settings" as never)}>
            <Text style={styles.actionText}>Settings</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={scan} disabled={loading || connecting}>
            <Text style={styles.actionText}>{loading ? "Scanning..." : "Scan"}</Text>
          </Pressable>
        </View>
      </View>

      {statusMessage ? (
        <Pressable style={styles.banner} onPress={clearStatus}>
          <Text style={styles.bannerText}>{statusMessage}</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={knownDevices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No TVs found yet. Tap Scan or Add TV manually.</Text>
        }
        renderItem={({ item }) => (
          <TVCard item={item} onPress={() => onDevicePress(item)} />
        )}
      />

      <Pressable
        style={[styles.addBtn, connecting && styles.disabled]}
        disabled={connecting}
        onPress={() => {
          setManualName("");
          setManualBrand("roku");
          setManualIp("");
          setManualPsk("");
          setManualOpen(true);
        }}
      >
        <Text style={styles.addBtnText}>+ Add TV Manually</Text>
      </Pressable>

      <Modal visible={manualOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add TV</Text>
            <TextInput
              style={styles.input}
              placeholder="Name (e.g. Living Room TV)"
              placeholderTextColor={theme.colors.textSecondary}
              value={manualName}
              onChangeText={setManualName}
            />
            <TextInput
              style={styles.input}
              placeholder="TV IP Address (e.g. 192.168.1.50)"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
              value={manualIp}
              onChangeText={setManualIp}
            />

            <View style={styles.brandWrap}>
              {brandOptions.map((brand) => (
                <Pressable
                  key={brand}
                  style={[
                    styles.brandPill,
                    manualBrand === brand && styles.brandPillSelected
                  ]}
                  onPress={() => setManualBrand(brand)}
                >
                  <Text style={styles.brandPillText}>{brand.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.helpText}>{manualBrandHelp[manualBrand]}</Text>

            {manualBrand === "sony" ? (
              <TextInput
                style={styles.input}
                placeholder="Sony Pre-Shared Key"
                placeholderTextColor={theme.colors.textSecondary}
                value={manualPsk}
                onChangeText={setManualPsk}
              />
            ) : null}

            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryBtn} onPress={() => setManualOpen(false)}>
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
        </View>
      </Modal>

      <Modal visible={Boolean(pairingPrompt)} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{pairingPrompt?.title}</Text>
            <Text style={styles.modalMessage}>{pairingPrompt?.message}</Text>
            <TextInput
              style={styles.input}
              placeholder={
                pairingPrompt?.kind === "pin"
                  ? "Enter 4-digit PIN"
                  : "Enter 6-digit code"
              }
              placeholderTextColor={theme.colors.textSecondary}
              value={pairingCode}
              onChangeText={setPairingCode}
              keyboardType="number-pad"
            />
            <View style={styles.modalActions}>
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
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md
  },
  centered: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center"
  },
  topBar: {
    paddingVertical: theme.spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  heading: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "800"
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  actionBtn: {
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  actionText: {
    color: theme.colors.text,
    fontWeight: "700"
  },
  list: {
    gap: theme.spacing.sm,
    paddingBottom: 140
  },
  empty: {
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 24
  },
  addBtn: {
    position: "absolute",
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: "center"
  },
  addBtnText: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: 16
  },
  disabled: {
    opacity: 0.5
  },
  banner: {
    backgroundColor: theme.colors.surfacePressed,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm
  },
  bannerText: {
    color: theme.colors.text,
    fontSize: 13
  },
  error: {
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: theme.spacing.md
  },
  modal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "800"
  },
  modalMessage: {
    color: theme.colors.textSecondary,
    fontSize: 14
  },
  helpText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17
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
  brandWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  brandPill: {
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 6,
    paddingHorizontal: 10
  },
  brandPillSelected: {
    backgroundColor: theme.colors.primary
  },
  brandPillText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "700"
  },
  modalActions: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: theme.spacing.sm
  },
  secondaryBtn: {
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  secondaryBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: "700"
  },
  primaryBtn: {
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  primaryBtnText: {
    color: theme.colors.text,
    fontWeight: "800"
  }
});
