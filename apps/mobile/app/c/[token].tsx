// Deep-link landing for `attuna://c/<token>`. Three jobs:
//   1. Stash the invite token in SecureStore so it survives the
//      sign-up flow (Cognito takes the user through email confirm,
//      which may navigate them away — we don't want to lose the
//      token to a refresh).
//   2. Tell the user what's happening.
//   3. Send them to sign-up. After they confirm + sign in, the
//      sign-in screen calls /api/c/link with the stashed token to
//      finish the link.

import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { setItem } from "@/lib/secure-store";
import { radius, space, useColors } from "@/theme";

export default function InviteToken() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const colors = useColors();
  const [stashed, setStashed] = useState<"pending" | "ok" | "missing">("pending");

  useEffect(() => {
    if (typeof token !== "string" || token.length < 20) {
      setStashed("missing");
      return;
    }
    setItem("pendingInviteToken", token)
      .then(() => setStashed("ok"))
      // Should be unreachable in practice — SecureStore only fails on
      // OS-level keychain access denial. Surface gracefully.
      .catch(() => setStashed("missing"));
  }, [token]);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heading}>
        <Text style={[styles.eyebrow, { color: colors.inkMute }]}>You&apos;re invited</Text>
        <Text style={[styles.title, { color: colors.ink }]}>Join your therapist on Attuna.</Text>
        <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
          We&apos;ll finish setting up your account after you create one. Your invite is held
          securely on this device until then.
        </Text>
      </View>

      {stashed === "missing" ? (
        <View
          style={[
            styles.errorCard,
            { backgroundColor: colors.surface, borderColor: colors.borderSoft },
          ]}
        >
          <Text style={[styles.errorTitle, { color: colors.ink }]}>
            This invite link is broken.
          </Text>
          <Text style={[styles.errorBody, { color: colors.inkSoft }]}>
            Ask your therapist to send it again.
          </Text>
        </View>
      ) : (
        <Pressable
          onPress={() => router.push("/sign-up")}
          disabled={stashed === "pending"}
          style={({ pressed }) => [
            styles.primary,
            {
              backgroundColor: pressed ? colors.accentDeep : colors.accent,
              opacity: stashed === "pending" ? 0.6 : 1,
            },
          ]}
        >
          <Text style={[styles.primaryLabel, { color: colors.inkOnAccent }]}>
            {stashed === "pending" ? "Preparing…" : "Create your account"}
          </Text>
        </Pressable>
      )}

      <Pressable onPress={() => router.push("/sign-in")} hitSlop={12}>
        <Text style={[styles.secondary, { color: colors.accent }]}>
          Already have an account? Sign in
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.xxl,
    gap: space.xxl,
  },
  heading: {
    gap: space.md,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontWeight: "500",
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
  },
  errorCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
    gap: space.sm,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  errorBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  primary: {
    height: 52,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  secondary: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
  },
});
