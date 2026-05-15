// Placeholder journal screen for M2.3b.3.B. Confirms the auth +
// link flow worked end-to-end by displaying the linked client info
// from SecureStore. The real list + write UI lands in M2.3b.3.C
// against the /api/entries endpoint.

import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { signOutCurrent } from "@/lib/cognito";
import { clearAll, getLinkedClient, type LinkedClient } from "@/lib/secure-store";
import { radius, space, useColors } from "@/theme";

export default function Journal() {
  const colors = useColors();
  const router = useRouter();
  const [linked, setLinked] = useState<LinkedClient | null | "loading">("loading");

  useEffect(() => {
    getLinkedClient().then(setLinked);
  }, []);

  async function onSignOut() {
    signOutCurrent();
    await clearAll();
    router.replace("/");
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.heading}>
        <Text style={[styles.title, { color: colors.ink }]}>You&apos;re in.</Text>
        <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
          The full journal UI (write + list of your own encrypted entries) lands in M2.3b.3.C. For
          now this screen confirms the Cognito sign-in + /api/c/link round-trip worked.
        </Text>
      </View>

      <View
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}
      >
        <Text style={[styles.cardLabel, { color: colors.inkMute }]}>Linked client</Text>
        {linked === "loading" ? (
          <Text style={[styles.value, { color: colors.inkFaint }]}>…</Text>
        ) : linked === null ? (
          <Text style={[styles.value, { color: colors.rose }]}>
            No linked client — try the invite link again.
          </Text>
        ) : (
          <View style={styles.kv}>
            <KV label="Workspace" value={linked.workspaceId} colors={colors} />
            <KV label="Client" value={linked.clientId} colors={colors} />
            <KV label="Client user" value={linked.clientUserId} colors={colors} />
          </View>
        )}
      </View>

      <Pressable
        onPress={onSignOut}
        style={({ pressed }) => [
          styles.secondaryBtn,
          { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.secondaryLabel, { color: colors.inkSoft }]}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function KV({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.kvRow}>
      <Text style={[styles.kvLabel, { color: colors.inkMute }]}>{label}</Text>
      <Text style={[styles.kvValue, { color: colors.ink }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
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
  heading: { gap: space.md },
  title: { fontSize: 26, fontWeight: "500", letterSpacing: -0.4 },
  subtitle: { fontSize: 14, lineHeight: 21 },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
    gap: space.sm,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  value: { fontSize: 14, fontWeight: "500" },
  kv: { gap: space.sm, marginTop: space.xs },
  kvRow: { flexDirection: "row", gap: space.md, alignItems: "baseline" },
  kvLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    width: 90,
  },
  kvValue: { fontSize: 12, fontFamily: "Menlo", flex: 1 },
  secondaryBtn: {
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: { fontSize: 14, fontWeight: "500" },
});
