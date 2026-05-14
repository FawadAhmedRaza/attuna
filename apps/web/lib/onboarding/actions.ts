"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@attuna/db/client";
import { isValidSlug } from "@attuna/db/lib/slug";
import { surveyRepo } from "@attuna/db/repositories/survey-repo";
import { workspaceRepo } from "@attuna/db/repositories/workspace-repo";
import { clientBand, practiceType, type PracticeType } from "@attuna/db/schema/workspace-survey";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export type OnboardingResult = { ok: true } | { ok: false; error: string };

const onboardingSchema = z.object({
  practice: z.string().trim().min(1, "Practice name is required").max(120),
  slug: z.string().trim().min(2).max(64),
  license: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v ? v : undefined)),
  practice_type: z.enum(practiceType),
  client_count: z.enum(clientBand).optional(),
  specialty: z.array(z.string()).default([]),
  priorities: z.array(z.string()).min(1, "Pick at least one priority"),
});

const PLAN_BY_PRACTICE_TYPE: Record<PracticeType, string> = {
  solo: "solo",
  group: "practice",
  clinic: "clinic",
  training: "training",
};

export async function submitOnboardingAction(
  _prev: OnboardingResult | null,
  formData: FormData,
): Promise<OnboardingResult> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return { ok: false, error: "Your session expired. Sign in to continue." };

  // formData.get returns null for missing fields; Zod expects undefined for
  // optionals and strings for required, so normalize first.
  const str = (k: string): string => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  const optStr = (k: string): string | undefined => {
    const v = formData.get(k);
    return typeof v === "string" && v.length > 0 ? v : undefined;
  };
  const raw = {
    practice: str("practice"),
    slug: str("slug"),
    license: optStr("license"),
    practice_type: str("practice_type"),
    client_count: optStr("client_count"),
    specialty: formData.getAll("specialty").map(String),
    priorities: formData.getAll("priorities").map(String),
  };
  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please complete the form before continuing.",
    };
  }
  if (!isValidSlug(parsed.data.slug)) {
    return {
      ok: false,
      error: "Workspace URL can only contain lowercase letters, numbers, and hyphens.",
    };
  }

  // Idempotency: if this user already has a workspace, send them to /today.
  // Prevents accidental duplicate workspaces from form replay or double-click.
  const existing = await workspaceRepo.listForUser(db(), session.userId);
  if (existing.length > 0) {
    redirect("/today");
  }

  const free = await workspaceRepo.isSlugAvailable(db(), parsed.data.slug);
  if (!free) {
    return { ok: false, error: "That workspace URL is taken — try another." };
  }

  try {
    const ws = await workspaceRepo.create(db(), {
      slug: parsed.data.slug,
      name: parsed.data.practice,
      ownerId: session.userId,
      plan: PLAN_BY_PRACTICE_TYPE[parsed.data.practice_type],
    });

    await surveyRepo.create(db(), {
      workspaceId: ws.id,
      license: parsed.data.license ?? null,
      practiceType: parsed.data.practice_type,
      clientCount: parsed.data.client_count ?? null,
      specialty: parsed.data.specialty,
      priorities: parsed.data.priorities,
    });
  } catch (err) {
    // Most likely cause: slug raced and is now taken. Don't surface internals.
    return { ok: false, error: "Could not create your workspace. Try again." };
  }

  // redirect MUST be outside the try/catch — it throws a NEXT_REDIRECT signal
  // that the action runtime catches and converts to an HTTP redirect.
  redirect("/today");
}
