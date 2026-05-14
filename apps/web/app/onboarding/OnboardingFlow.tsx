"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  Building2,
  Check,
  Heart,
  Mail,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Eyebrow } from "@attuna/ui/Eyebrow";
import { Field } from "@attuna/ui/Field";
import { Input } from "@attuna/ui/Input";
import { PillButton } from "@attuna/ui/PillButton";
import { PRICING_TIERS } from "@attuna/ui/pricing-data";
import { slugify } from "@attuna/db/lib/slug";

import { submitOnboardingAction } from "@/lib/onboarding/actions";

const STORAGE_KEY = "attuna_onboarding_v1";
const TOTAL_STEPS = 6; // 0..5 inclusive

type PracticeType = "" | "solo" | "group" | "clinic" | "training";
type ClientBand = "" | "1-10" | "11-25" | "26-50" | "50+";

type OnboardingData = {
  practice: string;
  slug: string;
  license: string;
  practice_type: PracticeType;
  client_count: ClientBand;
  specialty: string[];
  priorities: string[];
  invite: string;
};

const DEFAULT_DATA: OnboardingData = {
  practice: "",
  slug: "",
  license: "",
  practice_type: "",
  client_count: "",
  specialty: [],
  priorities: ["emotional"],
  invite: "",
};

const CLIENT_BANDS: Exclude<ClientBand, "">[] = ["1-10", "11-25", "26-50", "50+"];

const SPECIALTIES = [
  "Anxiety",
  "Depression",
  "Trauma",
  "Couples",
  "Adolescents",
  "Grief",
  "Identity",
  "Substance use",
  "OCD",
  "Eating concerns",
  "Family",
  "ADHD",
];

const INSIGHT_AREAS: { id: string; icon: LucideIcon; label: string; required?: boolean }[] = [
  { id: "emotional", icon: Heart, label: "Emotional", required: true },
  { id: "cognitive", icon: Brain, label: "Cognitive" },
  { id: "behavioral", icon: Target, label: "Behavioral" },
  { id: "avoidance", icon: AlertCircle, label: "Avoidance" },
  { id: "narrative", icon: BookOpen, label: "Narrative" },
  { id: "progress", icon: TrendingUp, label: "Progress" },
];

function loadData(): OnboardingData {
  if (typeof window === "undefined") return DEFAULT_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    const parsed = JSON.parse(raw) as Partial<OnboardingData>;
    return { ...DEFAULT_DATA, ...parsed };
  } catch {
    return DEFAULT_DATA;
  }
}

function saveData(data: OnboardingData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Quota or private mode — fall through; data lost on refresh.
  }
}

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(DEFAULT_DATA);
  const [hydrated, setHydrated] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadData();
    setData(loaded);
    setSlugTouched(loaded.slug.length > 0 && loaded.slug !== slugify(loaded.practice));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveData(data);
  }, [data, hydrated]);

  const update = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const updatePractice = (value: string) => {
    setData((d) => ({
      ...d,
      practice: value,
      slug: slugTouched ? d.slug : slugify(value),
    }));
  };

  const updateSlug = (value: string) => {
    setSlugTouched(true);
    setData((d) => ({ ...d, slug: slugify(value) }));
  };

  const toggleArr = (key: "specialty" | "priorities", value: string) =>
    setData((d) => ({
      ...d,
      [key]: d[key].includes(value) ? d[key].filter((x) => x !== value) : [...d[key], value],
    }));

  const finish = async () => {
    setPending(true);
    setSubmitError(null);

    const formData = new FormData();
    formData.set("practice", data.practice);
    formData.set("slug", data.slug);
    if (data.license) formData.set("license", data.license);
    if (data.practice_type) formData.set("practice_type", data.practice_type);
    if (data.client_count) formData.set("client_count", data.client_count);
    data.specialty.forEach((s) => formData.append("specialty", s));
    data.priorities.forEach((p) => formData.append("priorities", p));

    const result = await submitOnboardingAction(null, formData);
    if (result && result.ok === false) {
      setSubmitError(result.error);
      setPending(false);
      // Slug/practice errors live on step 1 — send the user back to fix them.
      const lower = result.error.toLowerCase();
      if (lower.includes("url") || lower.includes("slug") || lower.includes("practice")) {
        setStep(1);
      }
      return;
    }
    // Successful submit: the server action redirects, but if we get here
    // (e.g. action returned ok:true without redirecting in some future
    // refactor), fall back to a client-side push.
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    router.push("/today");
  };

  return (
    <div className="w-full">
      {step > 0 && step < TOTAL_STEPS - 1 ? (
        <ProgressHeader step={step} total={TOTAL_STEPS - 1} onBack={() => setStep((s) => s - 1)} />
      ) : null}

      <div className="fade-in" key={step}>
        {step === 0 && <StepWelcome onNext={() => setStep(1)} />}
        {step === 1 && (
          <StepPractice
            data={data}
            update={update}
            updatePractice={updatePractice}
            updateSlug={updateSlug}
            stepError={step === 1 ? submitError : null}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepSpecialties
            data={data}
            toggle={(s) => toggleArr("specialty", s)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <StepPriorities
            data={data}
            toggle={(p) => toggleArr("priorities", p)}
            onNext={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <StepInvite
            data={data}
            update={(v) => update("invite", v)}
            onSkip={() => setStep(5)}
            onSend={() => setStep(5)}
          />
        )}
        {step === 5 && <StepDone onOpen={finish} pending={pending} error={submitError} />}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Sub-components — kept colocated since they aren't reused elsewhere.
// ────────────────────────────────────────────────────────────────────

function ProgressHeader({
  step,
  total,
  onBack,
}: {
  step: number;
  total: number;
  onBack: () => void;
}) {
  const pct = (step / total) * 100;
  return (
    <div className="mb-8">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-ink-mute text-[12px] font-medium">
          Step {step} of {total}
        </span>
        <button
          type="button"
          onClick={onBack}
          className="text-accent inline-flex items-center gap-1 text-[12px] font-semibold hover:underline"
        >
          <ArrowLeft size={11} strokeWidth={1.75} /> Back
        </button>
      </div>
      <div className="bg-surface-deep h-1 overflow-hidden rounded-full">
        <div
          className="bg-accent ease-attuna h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function OnboardCard({
  centered = false,
  children,
}: {
  centered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "bg-surface border-border rounded-[24px] border p-8 md:p-11",
        centered ? "text-center" : "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <OnboardCard centered>
      <div
        className="bg-accent-bg mb-7 inline-flex items-center gap-2 rounded-full px-[18px] py-2"
        style={{ border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)" }}
      >
        <span aria-hidden="true">✦</span>
        <span className="text-accent text-[12px] font-semibold">You&apos;re verified</span>
      </div>
      <h1
        className="display text-ink m-0 mb-4 text-[36px] font-medium md:text-[44px]"
        style={{ letterSpacing: "-0.025em", lineHeight: 1.05 }}
      >
        Let&apos;s set up your
        <br />
        quiet workspace.
      </h1>
      <p
        className="text-ink-soft tracking-body mx-auto mb-8 max-w-[420px] text-[15px]"
        style={{ lineHeight: 1.65 }}
      >
        Three minutes. We&apos;ll learn about your practice, set your insight priorities, then
        invite your first client.
      </p>
      <div className="mb-8 grid grid-cols-3 gap-3 text-left">
        {[
          { icon: Building2, label: "Your practice" },
          { icon: Sparkles, label: "Priorities" },
          { icon: Users, label: "First client" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="bg-bg-soft border-border-soft rounded-[14px] border px-4 py-4"
            >
              <Icon size={15} strokeWidth={1.75} className="text-accent mb-2.5" />
              <div className="text-ink tracking-body text-[13px] font-semibold">{s.label}</div>
            </div>
          );
        })}
      </div>
      <PillButton variant="primary" size="md" onClick={onNext}>
        Begin <ArrowRight size={15} strokeWidth={1.75} />
      </PillButton>
    </OnboardCard>
  );
}

function StepEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3.5">
      <Eyebrow flanked={false}>{children}</Eyebrow>
    </div>
  );
}

function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <h2
        className="display text-ink m-0 mb-2 text-[28px] font-medium md:text-[32px]"
        style={{ letterSpacing: "-0.025em", lineHeight: 1.15 }}
      >
        {title}
      </h2>
      <p className="text-ink-soft mb-7 text-[14px] font-medium">{subtitle}</p>
    </>
  );
}

function TierCard({
  tier,
  selected,
  onClick,
}: {
  tier: (typeof PRICING_TIERS)[number];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "relative flex flex-col gap-2 rounded-[14px] border p-4 text-left transition-colors",
        selected ? "bg-accent-bg border-accent" : "bg-bg-soft border-border hover:border-accent/40",
      ].join(" ")}
    >
      {tier.featured ? (
        <span className="bg-warm text-ink-on-accent absolute -top-2 right-3 rounded-full px-2 py-0.5 text-[10px] font-semibold">
          Most chosen
        </span>
      ) : null}
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={[
            "display text-[18px] font-medium",
            selected ? "text-accent" : "text-ink",
          ].join(" ")}
          style={{ letterSpacing: "-0.015em" }}
        >
          {tier.name}
        </span>
        <span className="text-ink-mute text-[12px] font-medium">
          <span className={selected ? "text-accent" : "text-ink"}>${tier.price.monthly}</span>
          /mo
        </span>
      </div>
      <p className="text-ink-mute m-0 text-[12px] font-medium">{tier.tag}</p>
      <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0">
        {tier.features.slice(0, 2).map((f) => (
          <li
            key={f}
            className="text-ink-soft tracking-body flex gap-1.5 text-[12px]"
            style={{ lineHeight: 1.5 }}
          >
            <Check size={11} strokeWidth={2.5} className="text-sage mt-0.5 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </button>
  );
}

function ChoiceChip({
  selected,
  disabled = false,
  className = "",
  children,
  onClick,
}: {
  selected: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-[12px] border px-3.5 py-3 text-left text-[13px] font-medium transition-colors",
        selected ? "bg-accent-bg border-accent text-accent" : "bg-bg-soft border-border text-ink",
        disabled ? "cursor-default" : "cursor-pointer",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function StepPractice({
  data,
  update,
  updatePractice,
  updateSlug,
  stepError,
  onNext,
}: {
  data: OnboardingData;
  update: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  updatePractice: (value: string) => void;
  updateSlug: (value: string) => void;
  stepError: string | null;
  onNext: () => void;
}) {
  const canContinue = Boolean(data.practice && data.practice_type && data.slug);
  return (
    <OnboardCard>
      <StepEyebrow>Your practice</StepEyebrow>
      <StepHeading
        title="Tell us about your work."
        subtitle="This helps us tailor what you see and how briefs are framed."
      />
      <div className="flex flex-col gap-5">
        <Field label="Practice name" htmlFor="practice">
          <Input
            id="practice"
            value={data.practice}
            onChange={(e) => updatePractice(e.target.value)}
            placeholder="Karachi Therapy Collective"
          />
        </Field>
        <Field
          label="Workspace URL"
          htmlFor="slug"
          hint="Letters, numbers and hyphens. You can change this later."
        >
          <Input
            id="slug"
            value={data.slug}
            onChange={(e) => updateSlug(e.target.value)}
            placeholder="karachi-therapy"
          />
        </Field>
        <Field label="License number" htmlFor="license" hint="For verification only">
          <Input
            id="license"
            value={data.license}
            onChange={(e) => update("license", e.target.value)}
            placeholder="PCP-2847"
          />
        </Field>
        <Field label="Plan" hint="30-day free trial · no card needed · change later in settings">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PRICING_TIERS.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                selected={data.practice_type === tier.id}
                onClick={() => update("practice_type", tier.id)}
              />
            ))}
          </div>
        </Field>
        <Field label="Active clients">
          <div className="grid grid-cols-4 gap-2">
            {CLIENT_BANDS.map((b) => (
              <ChoiceChip
                key={b}
                selected={data.client_count === b}
                onClick={() => update("client_count", b)}
                className="text-center"
              >
                {b}
              </ChoiceChip>
            ))}
          </div>
        </Field>
      </div>
      {stepError ? (
        <p className="text-rose mt-5 text-[13px] font-medium" role="alert">
          {stepError}
        </p>
      ) : null}
      <div className="mt-7">
        <PillButton variant="primary" size="md" disabled={!canContinue} onClick={onNext}>
          Continue <ArrowRight size={15} strokeWidth={1.75} />
        </PillButton>
      </div>
    </OnboardCard>
  );
}

function StepSpecialties({
  data,
  toggle,
  onNext,
}: {
  data: OnboardingData;
  toggle: (s: string) => void;
  onNext: () => void;
}) {
  return (
    <OnboardCard>
      <StepEyebrow>Specialties</StepEyebrow>
      <StepHeading title="What do you focus on?" subtitle="Pick all that apply." />
      <div className="mb-7 flex flex-wrap gap-2">
        {SPECIALTIES.map((s) => {
          const selected = data.specialty.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors",
                selected
                  ? "bg-accent-bg border-accent text-accent"
                  : "border-border text-ink-soft bg-transparent",
              ].join(" ")}
            >
              {selected ? <Check size={11} strokeWidth={2.5} /> : null}
              {s}
            </button>
          );
        })}
      </div>
      <PillButton variant="primary" size="md" onClick={onNext}>
        Continue <ArrowRight size={15} strokeWidth={1.75} />
      </PillButton>
    </OnboardCard>
  );
}

function StepPriorities({
  data,
  toggle,
  onNext,
}: {
  data: OnboardingData;
  toggle: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <OnboardCard>
      <StepEyebrow>Priorities</StepEyebrow>
      <StepHeading
        title="Which patterns matter most?"
        subtitle="Emotional Experience is always on."
      />
      <div className="mb-7 grid grid-cols-2 gap-2.5">
        {INSIGHT_AREAS.map((area) => {
          const Icon = area.icon;
          const selected = data.priorities.includes(area.id) || area.required;
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => !area.required && toggle(area.id)}
              disabled={area.required}
              className={[
                "relative flex items-center gap-2.5 rounded-[14px] border px-4 py-4 text-left transition-colors",
                selected ? "bg-accent-bg border-accent" : "bg-bg-soft border-border",
                area.required ? "cursor-default" : "cursor-pointer",
              ].join(" ")}
            >
              {area.required ? (
                <span className="text-accent absolute right-2 top-1.5 text-[9px] font-semibold">
                  ✓ on
                </span>
              ) : null}
              <Icon
                size={15}
                strokeWidth={1.75}
                className={selected ? "text-accent" : "text-ink-mute"}
              />
              <span
                className={[
                  "text-[13px] font-semibold",
                  selected ? "text-accent" : "text-ink",
                ].join(" ")}
              >
                {area.label}
              </span>
            </button>
          );
        })}
      </div>
      <PillButton variant="primary" size="md" onClick={onNext}>
        Continue <ArrowRight size={15} strokeWidth={1.75} />
      </PillButton>
    </OnboardCard>
  );
}

function StepInvite({
  data,
  update,
  onSkip,
  onSend,
}: {
  data: OnboardingData;
  update: (value: string) => void;
  onSkip: () => void;
  onSend: () => void;
}) {
  return (
    <OnboardCard>
      <StepEyebrow>Optional</StepEyebrow>
      <StepHeading
        title="Invite your first client."
        subtitle="Discuss Attuna with them in session first. Consent matters."
      />
      <Field label="Client email" htmlFor="invite">
        <Input
          id="invite"
          name="invite"
          type="email"
          autoComplete="off"
          leftIcon={Mail}
          placeholder="firstclient@email.com"
          value={data.invite}
          onChange={(e) => update(e.target.value)}
        />
      </Field>
      <div className="bg-bg-soft border-border-soft mt-5 rounded-[14px] border px-5 py-4">
        <div className="text-ink-mute mb-2 text-[11px] font-semibold uppercase tracking-[0.04em]">
          Email preview
        </div>
        <p
          className="display-text text-ink-soft m-0 text-[14px] font-normal italic"
          style={{ lineHeight: 1.6 }}
        >
          &ldquo;I&apos;ve started using a tool called Attuna to help me prepare for our sessions.
          It&apos;s a journaling app — only I see what you write. Would you like to try?&rdquo;
        </p>
      </div>
      <div className="mt-6 flex gap-2.5">
        <PillButton variant="outline" size="md" onClick={onSkip} style={{ flex: 1 }}>
          Skip for now
        </PillButton>
        <PillButton
          variant="primary"
          size="md"
          onClick={onSend}
          disabled={!data.invite}
          style={{ flex: 1 }}
        >
          <Send size={14} strokeWidth={1.75} /> Send invite
        </PillButton>
      </div>
    </OnboardCard>
  );
}

function StepDone({
  onOpen,
  pending,
  error,
}: {
  onOpen: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <OnboardCard centered>
      <div
        className="bg-accent-bg mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full"
        style={{ border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)" }}
      >
        <Check size={32} strokeWidth={2} className="text-accent" />
      </div>
      <h1
        className="display text-ink m-0 mb-4 text-[36px] font-medium md:text-[44px]"
        style={{ letterSpacing: "-0.025em", lineHeight: 1.05 }}
      >
        You&apos;re ready.
      </h1>
      <p
        className="text-ink-soft tracking-body mx-auto mb-8 max-w-[420px] text-[15px]"
        style={{ lineHeight: 1.65 }}
      >
        Your account is set up. Briefs become available after a client journals for at least seven
        days.
      </p>
      <PillButton variant="primary" size="md" onClick={onOpen} disabled={pending}>
        {pending ? "Creating workspace…" : "Open my workspace"}{" "}
        {pending ? null : <ArrowRight size={15} strokeWidth={1.75} />}
      </PillButton>
      {error ? (
        <p className="text-rose mt-5 text-[13px] font-medium" role="alert">
          {error}
        </p>
      ) : null}
      <p
        className="display-text text-ink-faint mt-6 text-[13px] font-normal italic"
        style={{ letterSpacing: "-0.005em" }}
      >
        Attuna observes. It does not diagnose.
      </p>
    </OnboardCard>
  );
}

export default OnboardingFlow;
