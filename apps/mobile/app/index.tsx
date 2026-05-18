// Welcome screen. The first thing a client sees if they open the app
// directly (vs. via an invite deep link). M2.3b.3 will add a "you're
// already signed in" branch that skips this and lands on the journal.

import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, space, type, useColors } from "@/theme";

export default function Welcome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          backgroundColor: colors.bg,
          paddingTop: insets.top + space.xxl,
          paddingBottom: space.xxl,
        },
      ]}
    >
      <View style={styles.hero}>
        <Text style={[styles.eyebrow, { color: colors.inkMute }]}>Attuna</Text>
        <Text style={[styles.title, type.display, { color: colors.ink }]}>
          A quiet place to write between sessions.
        </Text>
        <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
          Your therapist invited you to journal. Only they can read what you write — no AI talks to
          you, no streaks, no audience.
        </Text>
      </View>

      <View style={styles.actions}>
        <Link href="/sign-in" asChild>
          <Pressable
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: pressed ? colors.accentDeep : colors.accent },
            ]}
          >
            <Text style={[styles.primaryLabel, { color: colors.inkOnAccent }]}>Sign in</Text>
          </Pressable>
        </Link>
        <Text style={[styles.hint, { color: colors.inkFaint }]}>
          Don&apos;t have an invite? Ask your therapist for a link — it&apos;ll open this app
          directly.
        </Text>
      </View>

      <View
        style={[
          styles.privacyCard,
          { backgroundColor: colors.surface, borderColor: colors.borderSoft },
        ]}
      >
        <Text style={[styles.privacyTitle, { color: colors.ink }]}>How privacy works here</Text>
        <Text style={[styles.privacyBody, { color: colors.inkSoft }]}>
          Entries are encrypted before they leave your phone. We can&apos;t read them, your phone
          provider can&apos;t read them, only your therapist can.
        </Text>
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
  hero: {
    gap: space.md,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: space.xs,
  },
  title: {
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    gap: space.md,
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
    letterSpacing: -0.1,
  },
  hint: {
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
    paddingHorizontal: space.lg,
  },
  privacyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
    gap: space.sm,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  privacyBody: {
    fontSize: 13,
    lineHeight: 20,
  },
});
