"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Lock } from "lucide-react";

import { Field } from "@attuna/ui/Field";
import { Input } from "@attuna/ui/Input";
import { PillButton } from "@attuna/ui/PillButton";
import { Toggle } from "@attuna/ui/Toggle";

import { signOutAction, type ActionResult } from "@/lib/auth/actions";
import { changePasswordAction } from "./_actions";

const ONBOARDING_KEY = "attuna_onboarding_v1";
const SETTINGS_KEY = "attuna_settings_v1";
const CREDENTIALS_KEY = "attuna_credentials_v1";
const PROFILE_KEY = "attuna_profile_v1";

const PRONOUN_PRESETS = ["She / her", "He / him", "They / them"] as const;

const TIME_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Madrid",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
] as const;

const PRACTICE_TYPES = [
  { id: "solo", label: "Solo private practice" },
  { id: "group", label: "Group practice" },
  { id: "clinic", label: "Multi-clinician clinic" },
  { id: "training", label: "Training program" },
] as const;

const LICENSE_TYPES = [
  { id: "lmft", label: "LMFT" },
  { id: "lcsw", label: "LCSW" },
  { id: "lpc", label: "LPC" },
  { id: "lmhc", label: "LMHC" },
  { id: "phd", label: "PhD" },
  { id: "psyd", label: "PsyD" },
  { id: "md", label: "MD / Psychiatrist" },
  { id: "other", label: "Other" },
] as const;

const SPECIALIZATIONS = [
  "CBT",
  "DBT",
  "EMDR",
  "IFS",
  "ACT",
  "Psychodynamic",
  "Trauma",
  "Couples",
  "Family",
  "Adolescents",
  "Grief",
  "Substance use",
] as const;

type PracticeType = (typeof PRACTICE_TYPES)[number]["id"] | "";
type LicenseType = (typeof LICENSE_TYPES)[number]["id"] | "";

type OnboardingShape = {
  practice?: string;
  license?: string;
  practice_type?: PracticeType;
};

type SettingsShape = {
  notifyBriefReady?: boolean;
  notifyDailySummary?: boolean;
};

type CredentialsShape = {
  licenseType?: LicenseType;
  // License number lives here (per-therapist) rather than in the onboarding
  // blob (which is a clinic-level fact). Migrated on first load if a value
  // already exists in onboarding.
  licenseNumber?: string;
  jurisdiction?: string;
  licenseExpiration?: string;
  npi?: string;
  specializations?: string[];
  yearsOfExperience?: string;
};

type ProfileShape = {
  preferredName?: string;
  pronouns?: string;
  phone?: string;
  timezone?: string;
};

function loadOnboarding(): OnboardingShape {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ONBOARDING_KEY) ?? "{}") as OnboardingShape;
  } catch {
    return {};
  }
}

function saveOnboarding(patch: OnboardingShape) {
  try {
    const current = loadOnboarding();
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {}
}

function loadSettings(): SettingsShape {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as SettingsShape;
  } catch {
    return {};
  }
}

function saveSettings(patch: SettingsShape) {
  try {
    const current = loadSettings();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {}
}

function loadCredentials(): CredentialsShape {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CREDENTIALS_KEY) ?? "{}") as CredentialsShape;
  } catch {
    return {};
  }
}

function saveCredentials(patch: CredentialsShape) {
  try {
    const current = loadCredentials();
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {}
}

function loadProfile(): ProfileShape {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}") as ProfileShape;
  } catch {
    return {};
  }
}

function saveProfile(patch: ProfileShape) {
  try {
    const current = loadProfile();
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {}
}

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

// ─── Profile card ────────────────────────────────────────────────────

export function ProfileCard({ name, email }: { name: string; email: string }) {
  const [hydrated, setHydrated] = useState(false);
  const [preferredName, setPreferredName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [customPronouns, setCustomPronouns] = useState(false);
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const p = loadProfile();
    setPreferredName(p.preferredName ?? "");
    const storedPronouns = p.pronouns ?? "";
    setPronouns(storedPronouns);
    setCustomPronouns(
      Boolean(storedPronouns) && !PRONOUN_PRESETS.includes(storedPronouns as never),
    );
    setPhone(p.phone ?? "");
    setTimezone(p.timezone ?? browserTimezone());
    setHydrated(true);
  }, []);

  function selectPreset(value: string) {
    setPronouns(value);
    setCustomPronouns(false);
  }

  function startCustom() {
    setCustomPronouns(true);
    if (PRONOUN_PRESETS.includes(pronouns as never)) setPronouns("");
  }

  function save() {
    saveProfile({
      preferredName: preferredName.trim(),
      pronouns: pronouns.trim(),
      phone: phone.trim(),
      timezone,
    });
    setSavedAt(Date.now());
  }

  return (
    <SettingsCard
      title="Profile"
      description="What clients see and how we reach you. Name and email come from your account."
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Name">
            <Input value={name} readOnly disabled />
          </Field>
          <Field label="Email">
            <Input value={email} readOnly disabled type="email" />
          </Field>
        </div>

        <Field
          label="Preferred name"
          htmlFor="prof-preferred"
          hint="Shown in client-facing places instead of your account name"
        >
          <Input
            id="prof-preferred"
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
            placeholder={name === "—" ? "Dr. Maya" : name}
            disabled={!hydrated}
          />
        </Field>

        <Field label="Pronouns">
          <div className="flex flex-wrap gap-2">
            {PRONOUN_PRESETS.map((p) => {
              const selected = !customPronouns && pronouns === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => selectPreset(p)}
                  disabled={!hydrated}
                  className={[
                    "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                    selected
                      ? "bg-accent-bg border-accent text-accent"
                      : "bg-bg-soft border-border text-ink-soft hover:text-ink",
                  ].join(" ")}
                  aria-pressed={selected}
                >
                  {p}
                </button>
              );
            })}
            <button
              type="button"
              onClick={startCustom}
              disabled={!hydrated}
              className={[
                "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                customPronouns
                  ? "bg-accent-bg border-accent text-accent"
                  : "bg-bg-soft border-border text-ink-soft hover:text-ink",
              ].join(" ")}
              aria-pressed={customPronouns}
            >
              Custom
            </button>
          </div>
          {customPronouns ? (
            <div className="mt-3">
              <Input
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
                placeholder="e.g. xe / xem"
                disabled={!hydrated}
                aria-label="Custom pronouns"
              />
            </div>
          ) : null}
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Phone" htmlFor="prof-phone" hint="Used for account recovery">
            <Input
              id="prof-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 415 555 0123"
              autoComplete="tel"
              disabled={!hydrated}
            />
          </Field>

          <Field label="Time zone" htmlFor="prof-tz" hint="Used for brief delivery times">
            <select
              id="prof-tz"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              disabled={!hydrated}
              className="bg-bg-soft text-ink tracking-body border-border focus:border-accent w-full rounded-[12px] border px-4 py-[13px] font-sans text-[14px] font-medium transition-[border-color,background] duration-200"
            >
              {!TIME_ZONES.includes(timezone as never) && timezone ? (
                <option value={timezone}>{timezone}</option>
              ) : null}
              {TIME_ZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <CardActions>
          <PillButton variant="primary" size="sm" onClick={save} disabled={!hydrated}>
            Save changes
          </PillButton>
          {savedAt ? <SavedHint /> : null}
        </CardActions>
      </div>
    </SettingsCard>
  );
}

// ─── Clinic card ─────────────────────────────────────────────────────
// Clinic-wide settings. Visible only to roles with `manage_clinic` (owner +
// clinic_admin). Therapists do not see this tab. License number used to live
// here; it has moved into Credentials where it belongs (per-therapist).

const CLINIC_KEY = "attuna_clinic_v1";

const INSIGHT_AREAS: ReadonlyArray<{ id: string; label: string; required?: boolean }> = [
  { id: "emotional", label: "Emotional", required: true },
  { id: "cognitive", label: "Cognitive" },
  { id: "behavioral", label: "Behavioral" },
  { id: "avoidance", label: "Avoidance" },
  { id: "narrative", label: "Narrative" },
  { id: "progress", label: "Progress" },
];

type ClinicShape = {
  defaultPriorities?: string[];
  briefDeliveryTime?: string;
};

function loadClinic(): ClinicShape {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CLINIC_KEY) ?? "{}") as ClinicShape;
  } catch {
    return {};
  }
}

function saveClinic(patch: ClinicShape) {
  try {
    const current = loadClinic();
    localStorage.setItem(CLINIC_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {}
}

export function ClinicCard() {
  const [hydrated, setHydrated] = useState(false);
  const [practice, setPractice] = useState("");
  const [type, setType] = useState<PracticeType>("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [deliveryTime, setDeliveryTime] = useState("07:00");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const o = loadOnboarding();
    setPractice(o.practice ?? "");
    setType(o.practice_type ?? "");
    const c = loadClinic();
    setPriorities(c.defaultPriorities ?? ["emotional"]);
    setDeliveryTime(c.briefDeliveryTime ?? "07:00");
    setHydrated(true);
  }, []);

  function togglePriority(id: string) {
    if (id === "emotional") return; // always on
    setPriorities((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function save() {
    saveOnboarding({ practice, practice_type: type });
    saveClinic({ defaultPriorities: priorities, briefDeliveryTime: deliveryTime });
    setSavedAt(Date.now());
  }

  return (
    <SettingsCard
      title="Clinic"
      description="Settings that apply to your whole practice. Only owners and clinic admins can change these."
    >
      <div className="flex flex-col gap-5">
        <Field label="Clinic name" htmlFor="set-practice">
          <Input
            id="set-practice"
            value={practice}
            onChange={(e) => setPractice(e.target.value)}
            placeholder="Karachi Therapy Collective"
            disabled={!hydrated}
          />
        </Field>

        <Field label="Clinic type">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PRACTICE_TYPES.map((p) => {
              const selected = type === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setType(p.id)}
                  disabled={!hydrated}
                  className={[
                    "rounded-[12px] border px-3.5 py-3 text-left text-[13px] font-medium transition-colors",
                    selected
                      ? "bg-accent-bg border-accent text-accent"
                      : "bg-bg-soft border-border text-ink",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field
          label="Default insight priorities"
          hint="Applied to new clients. Therapists can override per-client. Emotional is always on."
        >
          <div className="flex flex-wrap gap-2">
            {INSIGHT_AREAS.map((a) => {
              const selected = priorities.includes(a.id) || a.required;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => togglePriority(a.id)}
                  disabled={!hydrated || a.required}
                  aria-pressed={selected}
                  className={[
                    "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                    selected
                      ? "bg-accent-bg border-accent text-accent"
                      : "bg-bg-soft border-border text-ink-soft hover:text-ink",
                    a.required ? "cursor-default" : "cursor-pointer",
                  ].join(" ")}
                >
                  {a.label}
                  {a.required ? (
                    <span className="text-accent ml-1.5 text-[10px]">always</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Field>

        <Field
          label="Brief delivery time"
          htmlFor="set-delivery"
          hint="Local time we email session-ready briefs. Quiet hours are respected."
        >
          <Input
            id="set-delivery"
            type="time"
            value={deliveryTime}
            onChange={(e) => setDeliveryTime(e.target.value)}
            disabled={!hydrated}
          />
        </Field>

        <CardActions>
          <PillButton variant="primary" size="sm" onClick={save} disabled={!hydrated}>
            Save changes
          </PillButton>
          {savedAt ? <SavedHint /> : null}
        </CardActions>
      </div>
    </SettingsCard>
  );
}

// ─── Credentials card ────────────────────────────────────────────────

export function CredentialsCard() {
  const [hydrated, setHydrated] = useState(false);
  const [licenseType, setLicenseType] = useState<LicenseType>("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [expiration, setExpiration] = useState("");
  const [npi, setNpi] = useState("");
  const [years, setYears] = useState("");
  const [specs, setSpecs] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const c = loadCredentials();
    // One-time migration: license number used to live in onboarding (clinic
    // blob). Move it into credentials (per-therapist) on first hydration.
    let initialNumber = c.licenseNumber;
    if (initialNumber === undefined) {
      const o = loadOnboarding();
      if (o.license) {
        initialNumber = o.license;
        saveCredentials({ licenseNumber: o.license });
      }
    }
    setLicenseType(c.licenseType ?? "");
    setLicenseNumber(initialNumber ?? "");
    setJurisdiction(c.jurisdiction ?? "");
    setExpiration(c.licenseExpiration ?? "");
    setNpi(c.npi ?? "");
    setYears(c.yearsOfExperience ?? "");
    setSpecs(c.specializations ?? []);
    setHydrated(true);
  }, []);

  function toggleSpec(name: string) {
    setSpecs((cur) => (cur.includes(name) ? cur.filter((s) => s !== name) : [...cur, name]));
  }

  function save() {
    saveCredentials({
      licenseType,
      licenseNumber,
      jurisdiction,
      licenseExpiration: expiration,
      npi,
      yearsOfExperience: years,
      specializations: specs,
    });
    setSavedAt(Date.now());
  }

  return (
    <SettingsCard
      title="Credentials"
      description="Your clinical training and licensure. Used to frame briefs and verify your account."
    >
      <div className="flex flex-col gap-5">
        <Field label="License type">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LICENSE_TYPES.map((t) => {
              const selected = licenseType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setLicenseType(t.id)}
                  disabled={!hydrated}
                  className={[
                    "rounded-[12px] border px-3.5 py-3 text-center text-[13px] font-medium transition-colors",
                    selected
                      ? "bg-accent-bg border-accent text-accent"
                      : "bg-bg-soft border-border text-ink",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="License number" htmlFor="cred-num" hint="For verification only">
            <Input
              id="cred-num"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="PCP-2847"
              disabled={!hydrated}
            />
          </Field>

          <Field label="Jurisdiction" htmlFor="cred-jur" hint="State, province, or country">
            <Input
              id="cred-jur"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              placeholder="California, USA"
              disabled={!hydrated}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="License expiration" htmlFor="cred-exp">
            <Input
              id="cred-exp"
              type="date"
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
              disabled={!hydrated}
            />
          </Field>

          <div />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="NPI number" htmlFor="cred-npi" hint="Optional — US providers only">
            <Input
              id="cred-npi"
              value={npi}
              onChange={(e) => setNpi(e.target.value)}
              placeholder="1234567890"
              inputMode="numeric"
              maxLength={10}
              disabled={!hydrated}
            />
          </Field>

          <Field label="Years in practice" htmlFor="cred-years">
            <Input
              id="cred-years"
              type="number"
              min={0}
              max={70}
              value={years}
              onChange={(e) => setYears(e.target.value)}
              placeholder="8"
              disabled={!hydrated}
            />
          </Field>
        </div>

        <Field label="Specializations" hint="Pick any that apply">
          <div className="flex flex-wrap gap-2">
            {SPECIALIZATIONS.map((name) => {
              const selected = specs.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleSpec(name)}
                  disabled={!hydrated}
                  className={[
                    "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                    selected
                      ? "bg-accent-bg border-accent text-accent"
                      : "bg-bg-soft border-border text-ink-soft hover:text-ink",
                  ].join(" ")}
                  aria-pressed={selected}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </Field>

        <CardActions>
          <PillButton variant="primary" size="sm" onClick={save} disabled={!hydrated}>
            Save changes
          </PillButton>
          {savedAt ? <SavedHint /> : null}
        </CardActions>
      </div>
    </SettingsCard>
  );
}

// ─── Notifications card ──────────────────────────────────────────────

export function NotificationsCard() {
  const [hydrated, setHydrated] = useState(false);
  const [briefReady, setBriefReady] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);

  useEffect(() => {
    const s = loadSettings();
    setBriefReady(s.notifyBriefReady ?? true);
    setDailySummary(s.notifyDailySummary ?? false);
    setHydrated(true);
  }, []);

  return (
    <SettingsCard
      title="Notifications"
      description="We email you only what helps you prepare for sessions."
    >
      <div className="flex flex-col gap-5">
        <Toggle
          label="Brief ready"
          description="One email per client when a new brief is ready to read."
          checked={briefReady}
          disabled={!hydrated}
          onChange={(v) => {
            setBriefReady(v);
            saveSettings({ notifyBriefReady: v });
          }}
        />
        <Toggle
          label="Daily summary"
          description="A short morning note about today's clients. Off by default."
          checked={dailySummary}
          disabled={!hydrated}
          onChange={(v) => {
            setDailySummary(v);
            saveSettings({ notifyDailySummary: v });
          }}
        />
      </div>
    </SettingsCard>
  );
}

// ─── Security card ───────────────────────────────────────────────────

function PasswordSubmit() {
  const { pending } = useFormStatus();
  return (
    <PillButton type="submit" variant="primary" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Update password"}
    </PillButton>
  );
}

export function SecurityCard() {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    changePasswordAction,
    null,
  );
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (state?.ok) setSavedAt(Date.now());
  }, [state]);

  return (
    <SettingsCard
      title="Security"
      description="Change your password or sign out across all your devices."
    >
      <form
        action={formAction}
        className="mb-6 flex flex-col gap-5 border-b border-[var(--border-soft)] pb-6"
        noValidate
      >
        <Field label="Current password" htmlFor="set-cur">
          <Input
            id="set-cur"
            type="password"
            name="current"
            autoComplete="current-password"
            leftIcon={Lock}
            required
            invalid={state?.ok === false}
          />
        </Field>
        <Field label="New password" htmlFor="set-new">
          <Input
            id="set-new"
            type="password"
            name="next"
            autoComplete="new-password"
            leftIcon={Lock}
            minLength={8}
            required
            placeholder="At least 8 characters"
            invalid={state?.ok === false}
          />
        </Field>
        <Field label="Confirm new password" htmlFor="set-confirm">
          <Input
            id="set-confirm"
            type="password"
            name="confirm"
            autoComplete="new-password"
            minLength={8}
            required
            invalid={state?.ok === false}
          />
        </Field>
        {state?.ok === false ? (
          <p className="text-rose tracking-body text-[13px] font-medium" role="alert">
            {state.error}
          </p>
        ) : null}
        <CardActions>
          <PasswordSubmit />
          {savedAt && state?.ok ? <SavedHint label="Updated" /> : null}
        </CardActions>
      </form>

      <form action={signOutAction} className="flex flex-col gap-3">
        <p className="text-ink-soft text-[13px] font-medium" style={{ letterSpacing: "-0.005em" }}>
          Sign out of this device or all of your devices.
        </p>
        <div className="flex flex-wrap gap-2">
          <PillButton type="submit" variant="outline" size="sm">
            Sign out
          </PillButton>
          {/* "Sign out everywhere" is the same as sign out for now. Phase 2
              acceptance brings GlobalSignOut on Cognito. */}
          <PillButton type="submit" variant="ghost" size="sm" disabled>
            Sign out everywhere
          </PillButton>
        </div>
      </form>
    </SettingsCard>
  );
}

// ─── Privacy card (read-only for now) ────────────────────────────────

export function PrivacyCard() {
  return (
    <SettingsCard
      title="Privacy"
      description="Your clients' words belong to your clients. Yours belong to you."
    >
      <ul className="text-ink-soft m-0 flex list-none flex-col gap-3 p-0 text-[13px] font-medium">
        <PrivacyRow label="Export my data" hint="GDPR-style download. Available later in beta." />
        <PrivacyRow
          label="Delete my account"
          hint="Hard-delete with audit log retained for compliance."
        />
      </ul>
    </SettingsCard>
  );
}

function PrivacyRow({ label, hint }: { label: string; hint: string }) {
  return (
    <li className="flex items-start justify-between gap-4">
      <div>
        <div className="text-ink text-[14px] font-semibold" style={{ letterSpacing: "-0.005em" }}>
          {label}
        </div>
        <div className="text-ink-mute mt-0.5 text-[12px]">{hint}</div>
      </div>
      <PillButton variant="ghost" size="sm" disabled>
        Coming soon
      </PillButton>
    </li>
  );
}

// ─── Shared bits ─────────────────────────────────────────────────────

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface border-border rounded-2xl border p-7 md:p-8">
      <header className="mb-5">
        <h2
          className="display text-ink m-0 text-[18px] font-medium md:text-[20px]"
          style={{ letterSpacing: "-0.015em" }}
        >
          {title}
        </h2>
        <p
          className="text-ink-soft mt-1 text-[13px] font-medium"
          style={{ letterSpacing: "-0.005em" }}
        >
          {description}
        </p>
      </header>
      {children}
    </section>
  );
}

function CardActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

function SavedHint({ label = "Saved" }: { label?: string }) {
  return (
    <span className="text-sage text-[12px] font-semibold" aria-live="polite">
      {label}
    </span>
  );
}
