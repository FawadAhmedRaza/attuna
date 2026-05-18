// Thin API client for the Attuna backend. M2.3b.3 only needs /api/c/link
// to be reachable from mobile; M2.3c+ will add /api/entries and the
// brief endpoints. Every request goes through `request()` so we add
// Authorization: Bearer <idToken> in exactly one place.
//
// Base URL comes from EXPO_PUBLIC_API_URL — typically http://localhost:3000
// in dev (when the simulator can reach the host machine) or the
// deployed URL in staging/prod. Missing env throws lazily on first call.

import { currentIdToken } from "./cognito";

function getBaseUrl(): string {
  const u = process.env.EXPO_PUBLIC_API_URL;
  if (!u) {
    throw new Error(
      "EXPO_PUBLIC_API_URL must be set. Add it to apps/mobile/.env — e.g. http://localhost:3000",
    );
  }
  return u.replace(/\/$/, "");
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    /** When true, attach the current Cognito ID token as Bearer auth. */
    authed?: boolean;
    /** Explicit token override (used by /api/c/link before we have a
     *  cached session yet — sign-in just resolved and the token is in
     *  memory). */
    bearer?: string;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const bearer = options.bearer ?? (options.authed ? await currentIdToken() : null);
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Empty body? Return undefined cast to T (callers know).
  const text = await res.text();
  const json: unknown = text ? safeJson(text) : undefined;

  if (!res.ok) {
    const message =
      (json && typeof json === "object" && "error" in json && typeof json.error === "string"
        ? json.error
        : null) ?? `Request to ${path} failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return json as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// ── Endpoints ──────────────────────────────────────────────────────

export interface LinkResult {
  workspaceId: string;
  clientId: string;
  clientUserId: string;
}

export async function postLink(input: {
  inviteToken: string;
  idToken: string;
}): Promise<LinkResult> {
  return request<LinkResult>("/api/c/link", {
    method: "POST",
    body: input,
    bearer: input.idToken,
  });
}

export interface Entry {
  id: string;
  body: string;
  wordCount: number;
  writtenAt: string; // ISO string from the server
  createdAt: string;
}

export async function listEntries(): Promise<Entry[]> {
  const { entries } = await request<{ entries: Entry[] }>("/api/entries", {
    method: "GET",
    authed: true,
  });
  return entries;
}

export async function createEntry(input: { body: string; writtenAt?: Date }): Promise<Entry> {
  const { entry } = await request<{ entry: Entry }>("/api/entries", {
    method: "POST",
    authed: true,
    body: {
      body: input.body,
      writtenAt: input.writtenAt ? input.writtenAt.toISOString() : undefined,
    },
  });
  return entry;
}
