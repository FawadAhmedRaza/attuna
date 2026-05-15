// Deep-link landing for `attuna://c/<token>` and Universal Links
// (https://attuna.io/c/<token> → app open). The matching web route at
// /c/[token] does the actual accept in M2.2b; the mobile flow in
// M2.3b.3 will:
//   1. Stash the token in secure storage.
//   2. Send the user through sign-up if there's no Cognito session.
//   3. POST /api/c/link { inviteToken, idToken } once Cognito hands
//      back tokens, which links the new Cognito sub to the
//      client_user row + stamps custom:client_user_id.
//
// For M2.3b.2 we just prove deep linking works by echoing the token.

import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { radius, space, useColors } from "@/theme";

export default function InviteToken() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const colors = useColors();

  // Show only the first 8 chars + last 4 — the raw token is a
  // credential, and even on a paused phone screen we don't want it
  // fully visible in screenshots.
  const masked =
    typeof token === "string" && token.length > 12
      ? `${token.slice(0, 8)}…${token.slice(-4)}`
      : "(missing)";

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heading}>
        <Text style={[styles.eyebrow, { color: colors.inkMute }]}>You&apos;re invited</Text>
        <Text style={[styles.title, { color: colors.ink }]}>Join your therapist on Attuna.</Text>
        <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
          We&apos;ll finish setting up your account after you sign in. Your invite is held securely
          on this device until then.
        </Text>
      </View>

      <View
        style={[
          styles.tokenCard,
          { backgroundColor: colors.surface, borderColor: colors.borderSoft },
        ]}
      >
        <Text style={[styles.tokenLabel, { color: colors.inkMute }]}>Invite</Text>
        <Text style={[styles.tokenValue, { color: colors.ink }]}>{masked}</Text>
        <Text style={[styles.tokenNote, { color: colors.inkFaint }]}>
          M2.3b.3 wires the real accept flow. For now this screen proves the deep link works.
        </Text>
      </View>

      <Pressable
        onPress={() => router.push("/sign-in")}
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: pressed ? colors.accentDeep : colors.accent },
        ]}
      >
        <Text style={[styles.primaryLabel, { color: colors.inkOnAccent }]}>
          Continue to sign in
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
  tokenCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
    gap: space.sm,
  },
  tokenLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  tokenValue: {
    fontSize: 18,
    fontFamily: "Menlo",
    fontWeight: "500",
  },
  tokenNote: {
    fontSize: 12,
    fontStyle: "italic",
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
});
