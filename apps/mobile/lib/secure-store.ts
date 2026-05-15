// Typed wrapper around expo-secure-store. HIPAA §12: Secure Store is
// the ONLY allowed on-device storage for credentials and the invite
// token; nothing PHI-bearing (entry bodies, brief content) ever lands
// here. Keys are namespaced under `attuna.*` so we can wipe them all
// on sign-out without touching other apps' data.

import * as SecureStore from "expo-secure-store";

const PREFIX = "attuna.";

type StoreKey =
  | "pendingInviteToken" // dropped by /c/[token] deep link; consumed by sign-up post-confirm
  | "linkedClient" // JSON: { workspaceId, clientId, clientUserId } after /api/c/link succeeds
  | "lastSignedInEmail"; // small UX nicety — prefill the email field on next launch

export async function setItem(key: StoreKey, value: string): Promise<void> {
  await SecureStore.setItemAsync(PREFIX + key, value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

export async function getItem(key: StoreKey): Promise<string | null> {
  return SecureStore.getItemAsync(PREFIX + key);
}

export async function removeItem(key: StoreKey): Promise<void> {
  await SecureStore.deleteItemAsync(PREFIX + key);
}

export async function clearAll(): Promise<void> {
  // expo-secure-store has no "clear all" — delete by known key set.
  const keys: StoreKey[] = ["pendingInviteToken", "linkedClient", "lastSignedInEmail"];
  await Promise.all(keys.map((k) => SecureStore.deleteItemAsync(PREFIX + k)));
}

export type LinkedClient = {
  workspaceId: string;
  clientId: string;
  clientUserId: string;
};

export async function getLinkedClient(): Promise<LinkedClient | null> {
  const raw = await getItem("linkedClient");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LinkedClient;
  } catch {
    return null;
  }
}

export async function setLinkedClient(value: LinkedClient): Promise<void> {
  await setItem("linkedClient", JSON.stringify(value));
}
