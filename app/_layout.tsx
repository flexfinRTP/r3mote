import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TVProvider } from "@/context/TVContext";
import { theme } from "@/theme";

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "android") {
      const applyNavBarStyle = async () => {
        try {
          // Keep nav bar enhancement optional when running on older dev clients.
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const NavigationBar = require("expo-navigation-bar");
          await NavigationBar.setBackgroundColorAsync("rgba(11,26,48,0.6)");
          await NavigationBar.setButtonStyleAsync("light");
        } catch {
          // Ignore when native module is unavailable in the current runtime.
        }
      };
      applyNavBarStyle();
    }
  }, []);

  return (
    <SafeAreaProvider>
      <TVProvider>
        <StatusBar style="light" translucent={Platform.OS === "android"} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.text,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="index" options={{ title: "R3mote" }} />
          <Stack.Screen name="settings" options={{ title: "Settings" }} />
          <Stack.Screen name="help" options={{ title: "Advanced Help" }} />
          <Stack.Screen
            name="remote/[tvId]"
            options={{ headerShown: false, title: "Remote" }}
          />
        </Stack>
      </TVProvider>
    </SafeAreaProvider>
  );
}
