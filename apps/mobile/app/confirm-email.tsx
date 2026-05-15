// Email confirmation step (Cognito sends a 6-digit code post-signUp).
// On success we send the user to /sign-in so the same email + password
// flow completes the link.

import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { confirmSignUp, resendConfirmationCode } from "@/lib/cognito";
import { radius, space, useColors } from "@/theme";

export default function ConfirmEmail() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = typeof emailParam === "string" ? emailParam : "";

  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function onSubmit() {
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      await confirmSignUp(email, code);
      router.replace(`/sign-in?email=${encodeURIComponent(email)}&verified=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed.");
    } finally {
      setPending(false);
    }
  }

  async function onResend() {
    try {
      await resendConfirmationCode(email);
      setResent(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend.");
    }
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          backgroundColor: colors.bg,
          paddingTop: space.xl,
          paddingBottom: insets.bottom + space.xxl,
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heading}>
        <Text style={[styles.title, { color: colors.ink }]}>Confirm your email.</Text>
        <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
          We sent a 6-digit code to{" "}
          <Text style={{ color: colors.ink, fontWeight: "600" }}>{email || "your email"}</Text>.
          Codes expire in 24 hours.
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.inkMute }]}>Code</Text>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            placeholderTextColor={colors.inkFaint}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6}
            style={[
              styles.codeInput,
              { backgroundColor: colors.bgSoft, borderColor: colors.border, color: colors.ink },
            ]}
            editable={!pending}
          />
        </View>

        <Pressable
          onPress={onSubmit}
          disabled={pending}
          style={({ pressed }) => [
            styles.primary,
            {
              backgroundColor: pressed ? colors.accentDeep : colors.accent,
              opacity: pending ? 0.7 : 1,
            },
          ]}
        >
          {pending ? (
            <ActivityIndicator color={colors.inkOnAccent} />
          ) : (
            <Text style={[styles.primaryLabel, { color: colors.inkOnAccent }]}>Confirm</Text>
          )}
        </Pressable>

        {error ? <Text style={[styles.error, { color: colors.rose }]}>{error}</Text> : null}

        <Pressable onPress={onResend} hitSlop={12}>
          <Text style={[styles.secondary, { color: colors.accent }]}>
            {resent ? "Code resent." : "Resend code"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: space.xl,
    gap: space.xxl,
  },
  heading: { gap: space.sm },
  title: { fontSize: 26, fontWeight: "500", letterSpacing: -0.4 },
  subtitle: { fontSize: 14, lineHeight: 21 },
  form: { gap: space.lg },
  field: { gap: space.xs },
  label: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  codeInput: {
    height: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.md,
    fontSize: 28,
    textAlign: "center",
    letterSpacing: 8,
    fontWeight: "600",
  },
  primary: {
    height: 52,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: space.sm,
  },
  primaryLabel: { fontSize: 16, fontWeight: "600" },
  error: { fontSize: 13, fontWeight: "500", textAlign: "center" },
  secondary: { textAlign: "center", fontSize: 14, fontWeight: "500" },
});
