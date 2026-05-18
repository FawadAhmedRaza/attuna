// Cognito sign-in. If a pending invite token is in SecureStore from
// the deep-link landing (M2.3b.3 step 1), we call /api/c/link
// immediately after sign-in succeeds — this consumes the invite + ties
// the new Cognito sub to the client_user row on our side. The mobile
// app then stores { workspaceId, clientId, clientUserId } locally so
// the journal screens can render without another round-trip.

import { useEffect, useState } from "react";
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

import { postLink } from "@/lib/api";
import { signIn } from "@/lib/cognito";
import { getItem, removeItem, setItem, setLinkedClient } from "@/lib/secure-store";
import { radius, space, useColors } from "@/theme";

export default function SignIn() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { email: emailParam, verified } = useLocalSearchParams<{
    email?: string;
    verified?: string;
  }>();

  const [email, setEmail] = useState(typeof emailParam === "string" ? emailParam : "");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from SecureStore if we have it (returning user).
  useEffect(() => {
    if (email) return;
    getItem("lastSignedInEmail").then((stored) => {
      if (stored) setEmail(stored);
    });
  }, [email]);

  async function onSubmit() {
    if (!email.trim() || !password) {
      setError("Enter your email + password.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const { idToken } = await signIn(email.trim().toLowerCase(), password);
      await setItem("lastSignedInEmail", email.trim().toLowerCase());

      // If there's a pending invite token from /c/[token], consume it
      // now. Order matters: the server-side link must succeed before
      // we let the user past the welcome screen, since downstream
      // journal calls assume the link is in place.
      const pendingToken = await getItem("pendingInviteToken");
      if (pendingToken) {
        const linked = await postLink({ inviteToken: pendingToken, idToken });
        await setLinkedClient(linked);
        await removeItem("pendingInviteToken");
      }

      // Successful path → journal. (Screen lands in M2.3b.3.C.)
      router.replace("/journal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Try again.");
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
        <Text style={[styles.title, { color: colors.ink }]}>Sign in to journal.</Text>
        <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
          Use the email your therapist invited.
        </Text>
        {verified === "1" ? (
          <View
            style={[
              styles.banner,
              { backgroundColor: colors.accentBg, borderColor: colors.accent },
            ]}
          >
            <Text style={[styles.bannerText, { color: colors.accentDeep }]}>
              Email verified. Sign in to continue.
            </Text>
          </View>
        ) : null}
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
            autoComplete="password"
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
            <Text style={[styles.primaryLabel, { color: colors.inkOnAccent }]}>Sign in</Text>
          )}
        </Pressable>

        {error ? <Text style={[styles.error, { color: colors.rose }]}>{error}</Text> : null}

        <Pressable onPress={() => router.push("/sign-up")} hitSlop={12}>
          <Text style={[styles.secondary, { color: colors.accent }]}>
            New here? Create an account
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
  banner: {
    marginTop: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  bannerText: { fontSize: 13, fontWeight: "500" },
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
