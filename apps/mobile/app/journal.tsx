// Real journal screen (M2.3b.3.C). Lists the client's own entries
// decrypted by the server and lets them write a new one. The
// /api/entries calls go through lib/api which attaches the Cognito
// ID token. HIPAA §12: bodies never persist to AsyncStorage; they
// live in React state for the lifetime of the screen.

import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { createEntry, type Entry, listEntries } from "@/lib/api";
import { signOutCurrent } from "@/lib/cognito";
import { clearAll } from "@/lib/secure-store";
import { radius, space, useColors } from "@/theme";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; entries: Entry[] }
  | { kind: "error"; message: string };

export default function Journal() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const entries = await listEntries();
      setState({ kind: "ready", entries });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Couldn't load your entries.",
      });
    }
  }, []);

  // Refresh when the screen first mounts and whenever it regains focus
  // (e.g. user backgrounded + reopened the app). useFocusEffect's
  // callback runs on every focus; we keep the loading state on first
  // mount and use the RefreshControl spinner for subsequent reloads.
  useEffect(() => {
    void load();
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      if (state.kind === "ready") {
        // Cheap re-fetch on re-focus; the screen already has content
        // to display while we wait.
        void load();
      }
      // We intentionally don't depend on `load` here — recreating it
      // each render would trigger a refetch on every state change.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  async function onPullToRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function onSubmit() {
    if (!draft.trim()) {
      setSubmitError("Write a little something first.");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const created = await createEntry({ body: draft, writtenAt: new Date() });
      setDraft("");
      setState((prev) =>
        prev.kind === "ready"
          ? { kind: "ready", entries: [created, ...prev.entries] }
          : { kind: "ready", entries: [created] },
      );
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Couldn't save. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSignOut() {
    signOutCurrent();
    await clearAll();
    router.replace("/");
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          backgroundColor: colors.bg,
          paddingTop: space.lg,
          paddingBottom: insets.bottom + space.xxl,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onPullToRefresh}
          tintColor={colors.inkMute}
        />
      }
    >
      <View style={styles.heading}>
        <Text style={[styles.title, { color: colors.ink }]}>Your journal.</Text>
        <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
          Only your therapist can read these. Encrypted before they leave your phone.
        </Text>
      </View>

      <View
        style={[
          styles.composer,
          { backgroundColor: colors.surface, borderColor: colors.borderSoft },
        ]}
      >
        <Text style={[styles.composerLabel, { color: colors.inkMute }]}>
          What&apos;s on your mind?
        </Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Today went…"
          placeholderTextColor={colors.inkFaint}
          multiline
          editable={!submitting}
          style={[styles.composerInput, { color: colors.ink }]}
        />
        <View style={styles.composerActions}>
          <Text style={[styles.composerHint, { color: colors.inkFaint }]}>
            Three sentences is plenty.
          </Text>
          <Pressable
            onPress={onSubmit}
            disabled={submitting || !draft.trim()}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: pressed ? colors.accentDeep : colors.accent,
                opacity: submitting || !draft.trim() ? 0.6 : 1,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.inkOnAccent} />
            ) : (
              <Text style={[styles.saveLabel, { color: colors.inkOnAccent }]}>Save</Text>
            )}
          </Pressable>
        </View>
        {submitError ? (
          <Text style={[styles.error, { color: colors.rose }]}>{submitError}</Text>
        ) : null}
      </View>

      <EntriesBlock state={state} colors={colors} onRetry={load} />

      <Pressable
        onPress={onSignOut}
        style={({ pressed }) => [
          styles.signOutBtn,
          { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.signOutLabel, { color: colors.inkSoft }]}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function EntriesBlock({
  state,
  colors,
  onRetry,
}: {
  state: LoadState;
  colors: ReturnType<typeof useColors>;
  onRetry: () => void;
}) {
  if (state.kind === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.inkMute} />
      </View>
    );
  }
  if (state.kind === "error") {
    return (
      <View
        style={[
          styles.errorCard,
          { backgroundColor: colors.surface, borderColor: colors.borderSoft },
        ]}
      >
        <Text style={[styles.errorTitle, { color: colors.ink }]}>Couldn&apos;t load.</Text>
        <Text style={[styles.errorBody, { color: colors.inkSoft }]}>{state.message}</Text>
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryBtn,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.retryLabel, { color: colors.accent }]}>Try again</Text>
        </Pressable>
      </View>
    );
  }
  if (state.entries.length === 0) {
    return (
      <View
        style={[
          styles.emptyCard,
          { backgroundColor: colors.surface, borderColor: colors.borderSoft },
        ]}
      >
        <Text style={[styles.emptyBody, { color: colors.inkSoft }]}>
          No entries yet. Write your first one above whenever you&apos;re ready.
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.list}>
      <View style={styles.listHeader}>
        <Text style={[styles.listHeading, { color: colors.ink }]}>Your entries</Text>
        <Text style={[styles.listCount, { color: colors.inkMute }]}>{state.entries.length}</Text>
      </View>
      {state.entries.map((e) => (
        <View
          key={e.id}
          style={[
            styles.entryCard,
            { backgroundColor: colors.surface, borderColor: colors.borderSoft },
          ]}
        >
          <Text style={[styles.entryMeta, { color: colors.inkMute }]}>
            {prettyDate(e.writtenAt)} · {e.wordCount} {e.wordCount === 1 ? "word" : "words"}
          </Text>
          <Text style={[styles.entryBody, { color: colors.ink }]}>{e.body}</Text>
        </View>
      ))}
    </View>
  );
}

function prettyDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: space.xl,
    gap: space.xl,
  },
  heading: { gap: space.sm },
  title: { fontSize: 24, fontWeight: "500", letterSpacing: -0.4 },
  subtitle: { fontSize: 13, lineHeight: 20 },
  composer: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
    gap: space.sm,
  },
  composerLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  composerInput: {
    minHeight: 120,
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: space.xs,
    textAlignVertical: "top",
  },
  composerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    marginTop: space.xs,
  },
  composerHint: { fontSize: 11, fontStyle: "italic", flexShrink: 1 },
  saveBtn: {
    height: 40,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 88,
  },
  saveLabel: { fontSize: 14, fontWeight: "600" },
  error: { fontSize: 13, fontWeight: "500" },
  loading: {
    paddingVertical: space.xxl,
    alignItems: "center",
  },
  list: { gap: space.md },
  listHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.sm,
    paddingHorizontal: space.xs,
  },
  listHeading: { fontSize: 16, fontWeight: "600", letterSpacing: -0.2 },
  listCount: { fontSize: 13, fontWeight: "500" },
  entryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
    gap: space.sm,
  },
  entryMeta: { fontSize: 11, fontWeight: "500" },
  entryBody: { fontSize: 15, lineHeight: 23 },
  emptyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.xl,
    alignItems: "center",
  },
  emptyBody: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  errorCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
    gap: space.sm,
  },
  errorTitle: { fontSize: 15, fontWeight: "600" },
  errorBody: { fontSize: 13, lineHeight: 20 },
  retryBtn: {
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: space.xs,
  },
  retryLabel: { fontSize: 14, fontWeight: "500" },
  signOutBtn: {
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: space.md,
  },
  signOutLabel: { fontSize: 13, fontWeight: "500" },
});
