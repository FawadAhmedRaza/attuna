// Root layout for the Expo Router stack. Renders:
//   • A SafeAreaProvider so screens can opt into safe-area insets.
//   • A Stack with a calm header style that adapts to light/dark.
//
// Real auth gating, push-notification permission, and biometric unlock
// land in M2.3b.3 + the pre-beta slice. M2.3b.2 keeps this minimal so
// the scaffold is reviewable.

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useColors } from "@/theme";

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = useColors();

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTitleStyle: { color: colors.ink, fontSize: 17, fontWeight: "600" },
          headerTintColor: colors.accent,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ title: "Sign in" }} />
        <Stack.Screen name="sign-up" options={{ title: "Create account" }} />
        <Stack.Screen name="confirm-email" options={{ title: "Confirm email" }} />
        <Stack.Screen name="c/[token]" options={{ title: "You're invited" }} />
        <Stack.Screen name="journal" options={{ headerBackVisible: false, title: "Journal" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
