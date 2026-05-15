// Placeholder sign-in screen. M2.3b.3 wires Cognito via
// amazon-cognito-identity-js (SRP — password never leaves the device).
// For M2.3b.2 this is layout only; the button is intentionally inert.

import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, space, useColors } from "@/theme";

export default function SignIn() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
            style={[
              styles.input,
              { backgroundColor: colors.bgSoft, borderColor: colors.border, color: colors.ink },
            ]}
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
            style={[
              styles.input,
              { backgroundColor: colors.bgSoft, borderColor: colors.border, color: colors.ink },
            ]}
          />
        </Field>

        <Pressable
          disabled
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: pressed ? colors.accentDeep : colors.accent, opacity: 0.5 },
          ]}
        >
          <Text style={[styles.primaryLabel, { color: colors.inkOnAccent }]}>
            Sign in (wired in M2.3b.3)
          </Text>
        </Pressable>

        <Text style={[styles.note, { color: colors.inkFaint }]}>
          This screen is a layout placeholder — Cognito sign-in wires in the next slice.
        </Text>
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
  heading: {
    gap: space.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: "500",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
  },
  form: {
    gap: space.lg,
  },
  field: {
    gap: space.xs,
  },
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
  primaryLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  note: {
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
  },
});
