import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { TVProvider } from "@/context/TVContext";
import { theme } from "@/theme";

export default function RootLayout() {
  return (
    <TVProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: "slide_from_right"
        }}
      >
        <Stack.Screen name="index" options={{ title: "R3mote" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="remote/[tvId]" options={{ title: "Remote" }} />
      </Stack>
    </TVProvider>
  );
}
