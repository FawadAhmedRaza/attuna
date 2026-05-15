// Cognito sign-up against the client pool (M2.3b.3). On success
// Cognito sends a verification code; we navigate to /confirm-email
// to collect it. The pending invite token (set by /c/[token] earlier)
// stays in SecureStore until sign-in completes the link.

import { useState } from "react";
import { useRouter } from "expo-router";
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

import { signUp } from "@/lib/cognito";
import { setItem } from "@/lib/secure-store";
import { radius, space, useColors } from "@/theme";

export default function SignUp() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!email.trim() || !password) {
      setError("Enter your email + a password.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      await signUp(email.trim().toLowerCase(), password);
      // Remember email so the next screen can prefill + so the
      // re-attempt UX after the email is verified is friction-free.
      await setItem("lastSignedInEmail", email.trim().toLowerCase());
      router.push(`/confirm-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed. Try again.");
    } finally {
      setPending(false);
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
        <Text style={[styles.title, { color: colors.ink }]}>Create your account.</Text>
        <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
          Use the email your therapist invited. We&apos;ll send you a 6-digit code to confirm.
        </Text>
      </View>

      <View style={styles.form}>
        <Field label="Email" colors={colors}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.inkFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            style={[
              styles.input,
              { backgroundColor: colors.bgSoft, borderColor: colors.border, color: colors.ink },
            ]}
            editable={!pending}
          />
        </Field>

        <Field label="Password" colors={colors}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            placeholderTextColor={colors.inkFaint}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password-new"
            style={[
              styles.input,
              { backgroundColor: colors.bgSoft, borderColor: colors.border, color: colors.ink },
            ]}
            editable={!pending}
          />
        </Field>

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
            <Text style={[styles.primaryLabel, { color: colors.inkOnAccent }]}>Continue</Text>
          )}
        </Pressable>

        {error ? <Text style={[styles.error, { color: colors.rose }]}>{error}</Text> : null}

        <Pressable onPress={() => router.push("/sign-in")} hitSlop={12}>
          <Text style={[styles.secondary, { color: colors.accent }]}>
            Already have an account? Sign in
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Field({
  label,
  children,
  colors,
}: {
  label: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.inkMute }]}>{label}</Text>
      {children}
    </View>
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
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.md,
    fontSize: 15,
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
