"use client";

import { useEffect, useState } from "react";
import { Check, CreditCard, Download, Lock, Trash2, X } from "lucide-react";

import { Field } from "@attuna/ui/Field";
import { Input } from "@attuna/ui/Input";
import { PillButton } from "@attuna/ui/PillButton";

import { useRole } from "@/lib/rbac";

import { PageHeader } from "../_components/PageHeader";

type Plan = {
  id: "solo" | "group" | "clinic";
  name: string;
  monthly: number;
  description: string;
  features: string[];
  seats: string;
};

const PLANS: Plan[] = [
  {
    id: "solo",
    name: "Solo",
    monthly: 19,
    description: "For private practitioners. One therapist, unlimited clients.",
    seats: "1 therapist",
    features: [
      "Up to 30 active clients",
      "Daily briefs and suggestions",
      "Email-based delivery",
      "30-day audit log retention",
    ],
  },
  {
    id: "group",
    name: "Group",
    monthly: 99,
    description: "For small practices. Shared client list across therapists.",
    seats: "Up to 5 therapists",
    features: [
      "Up to 150 active clients",
      "Co-therapist sharing",
      "Audit log retention 1 year",
      "Priority email support",
    ],
  },
  {
    id: "clinic",
    name: "Clinic",
    monthly: 399,
    description: "For multi-clinician clinics with HIPAA compliance needs.",
    seats: "Unlimited therapists",
    features: [
      "Unlimited clients",
      "SSO & domain verification",
      "Audit log retention 6 years",
      "Dedicated CSM",
      "BAA included",
    ],
  },
];

const CURRENT_PLAN_ID: Plan["id"] = "clinic";

const USAGE = [
  { label: "Active clients", used: 82, limit: null as number | null, suffix: "" },
  { label: "Therapists", used: 4, limit: null, suffix: "" },
  { label: "Briefs this month", used: 187, limit: null, suffix: "" },
  { label: "Storage", used: 12.4, limit: 100, suffix: " GB" },
];

const INVOICES = [
  { id: "INV-2026-0042", date: "Apr 1, 2026", amount: 399, status: "Paid" as const },
  { id: "INV-2026-0035", date: "Mar 1, 2026", amount: 399, status: "Paid" as const },
  { id: "INV-2026-0028", date: "Feb 1, 2026", amount: 399, status: "Paid" as const },
  { id: "INV-2026-0021", date: "Jan 1, 2026", amount: 399, status: "Paid" as const },
];

export default function BillingPage() {
  const { can } = useRole();
  const canManage = can("manage_billing");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [card, setCard] = useState<StoredCard | null>(null);

  useEffect(() => {
    setCard(loadCard());
  }, []);

  const current = PLANS.find((p) => p.id === CURRENT_PLAN_ID)!;

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="Account"
        title="Subscription"
        subtitle="Your plan, usage, and billing history."
        action={
          canManage ? (
            <PillButton variant="outline" size="sm" onClick={() => setPaymentOpen(true)}>
              <CreditCard size={14} strokeWidth={1.75} />
              Manage payment
            </PillButton>
          ) : null
        }
      />

      <CurrentPlanCard plan={current} canManage={canManage} />
      <PaymentMethodCard card={card} canManage={canManage} onManage={() => setPaymentOpen(true)} />
      <UsageCard />
      <PlansGrid currentId={current.id} canManage={canManage} />
      <InvoiceTable canManage={canManage} />

      {paymentOpen ? (
        <PaymentMethodModal
          card={card}
          onClose={() => setPaymentOpen(false)}
          onSave={(next) => {
            saveCard(next);
            setCard(next);
            setPaymentOpen(false);
          }}
          onRemove={() => {
            clearCard();
            setCard(null);
            setPaymentOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

// ─── Payment method storage ──────────────────────────────────────────

const PAYMENT_KEY = "attuna_payment_v1";

type StoredCard = {
  brand: string;
  last4: string;
  name: string;
  expMonth: string;
  expYear: string;
  zip: string;
};

function loadCard(): StoredCard | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PAYMENT_KEY);
    return raw ? (JSON.parse(raw) as StoredCard) : null;
  } catch {
    return null;
  }
}

function saveCard(card: StoredCard) {
  try {
    localStorage.setItem(PAYMENT_KEY, JSON.stringify(card));
  } catch {}
}

function clearCard() {
  try {
    localStorage.removeItem(PAYMENT_KEY);
  } catch {}
}

function detectBrand(number: string): string {
  const digits = number.replace(/\D/g, "");
  if (digits.startsWith("4")) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (digits.startsWith("6")) return "Discover";
  return "Card";
}

function CurrentPlanCard({ plan, canManage }: { plan: Plan; canManage: boolean }) {
  return (
    <div className="bg-surface border-border mb-5 rounded-2xl border p-7 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-ink-mute mb-1 text-[10px] font-semibold uppercase tracking-[0.06em]">
            Current plan
          </div>
          <div className="flex flex-wrap items-baseline gap-3">
            <h2
              className="display text-ink m-0 text-[28px] font-medium md:text-[32px]"
              style={{ letterSpacing: "-0.02em" }}
            >
              {plan.name}
            </h2>
            <span className="bg-accent-bg text-accent inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold">
              Active · 28 days left
            </span>
          </div>
          <p
            className="text-ink-mute mt-2 text-[13px] font-medium"
            style={{ letterSpacing: "-0.005em" }}
          >
            {plan.description}
          </p>
          <div className="text-ink-soft mt-3 text-[13px] font-medium">
            <span className="display text-ink text-[20px] font-medium">${plan.monthly}</span>
            <span className="text-ink-mute"> / month · billed monthly · {plan.seats}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PillButton variant="ghost" size="sm" disabled={!canManage}>
            Pause plan
          </PillButton>
          <PillButton variant="outline" size="sm" disabled={!canManage}>
            Cancel
          </PillButton>
        </div>
      </div>
      {!canManage ? (
        <p className="text-ink-mute mt-4 text-[12px] font-medium italic">
          Read-only — only owners can change billing.
        </p>
      ) : null}
    </div>
  );
}

function UsageCard() {
  return (
    <div className="bg-surface border-border mb-5 rounded-2xl border p-7 md:p-8">
      <h3
        className="display text-ink m-0 text-[18px] font-medium md:text-[20px]"
        style={{ letterSpacing: "-0.015em" }}
      >
        Usage this period
      </h3>
      <p
        className="text-ink-mute mt-1 text-[12px] font-medium"
        style={{ letterSpacing: "-0.005em" }}
      >
        Resets on the first of each month.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-4">
        {USAGE.map((u) => {
          const pct = u.limit ? Math.round((u.used / u.limit) * 100) : null;
          return (
            <div key={u.label}>
              <div className="text-ink-mute mb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em]">
                {u.label}
              </div>
              <div
                className="display text-ink text-[24px] font-medium leading-none md:text-[26px]"
                style={{ letterSpacing: "-0.02em" }}
              >
                {u.used}
                {u.suffix}
                {u.limit ? (
                  <span className="text-ink-mute text-[14px] font-medium">
                    {" "}
                    / {u.limit}
                    {u.suffix}
                  </span>
                ) : null}
              </div>
              {pct !== null ? (
                <div className="bg-surface-deep mt-3 h-1 overflow-hidden rounded-full">
                  <div
                    className="bg-accent h-full rounded-full"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              ) : (
                <div className="text-ink-mute mt-2 text-[11px] font-medium">No cap on plan</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlansGrid({ currentId, canManage }: { currentId: Plan["id"]; canManage: boolean }) {
  return (
    <section className="mb-5">
      <h3
        className="display text-ink m-0 mb-1 text-[18px] font-medium md:text-[20px]"
        style={{ letterSpacing: "-0.015em" }}
      >
        Plans
      </h3>
      <p
        className="text-ink-mute mb-5 text-[12px] font-medium"
        style={{ letterSpacing: "-0.005em" }}
      >
        Switch any time. Pro-rated changes take effect next cycle.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = p.id === currentId;
          return (
            <div
              key={p.id}
              className={[
                "rounded-2xl border p-6 md:p-7",
                isCurrent ? "bg-accent-bg/40 border-accent" : "bg-surface border-border",
              ].join(" ")}
            >
              <div className="mb-3 flex items-baseline justify-between">
                <h4
                  className="display text-ink m-0 text-[20px] font-medium md:text-[22px]"
                  style={{ letterSpacing: "-0.015em" }}
                >
                  {p.name}
                </h4>
                {isCurrent ? (
                  <span className="bg-accent text-ink-on-accent inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]">
                    Current
                  </span>
                ) : null}
              </div>

              <div className="display text-ink mb-1 text-[28px] font-medium leading-none">
                ${p.monthly}
                <span className="text-ink-mute text-[13px] font-medium"> / month</span>
              </div>
              <div className="text-ink-mute mb-4 text-[12px] font-medium">{p.seats}</div>

              <ul className="m-0 mb-5 flex list-none flex-col gap-2 p-0">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="text-ink-soft tracking-body flex items-start gap-2 text-[13px]"
                  >
                    <Check
                      size={13}
                      strokeWidth={2.5}
                      className="text-accent mt-0.5 flex-shrink-0"
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <PillButton
                variant={isCurrent ? "ghost" : "primary"}
                size="sm"
                disabled={isCurrent || !canManage}
              >
                {isCurrent ? "Active plan" : `Switch to ${p.name}`}
              </PillButton>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function InvoiceTable({ canManage }: { canManage: boolean }) {
  return (
    <section>
      <h3
        className="display text-ink m-0 mb-3 text-[18px] font-medium md:text-[20px]"
        style={{ letterSpacing: "-0.015em" }}
      >
        Invoices
      </h3>
      <div className="bg-surface border-border overflow-hidden rounded-2xl border">
        {INVOICES.map((inv, i) => (
          <div
            key={inv.id}
            className={[
              "grid items-center gap-3 px-5 py-4 md:grid-cols-[1.5fr_1fr_1fr_auto] md:px-6",
              i > 0 ? "border-border-soft border-t" : "",
            ].join(" ")}
          >
            <div className="text-ink-mute font-mono text-[12px]">{inv.id}</div>
            <div
              className="text-ink-soft text-[13px] font-medium"
              style={{ letterSpacing: "-0.005em" }}
            >
              {inv.date}
            </div>
            <div className="display text-ink text-[15px] font-medium">${inv.amount}.00</div>
            <div className="flex items-center justify-end gap-3">
              <span className="bg-[var(--sage,#3d8b5a)]/10 text-sage inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold">
                {inv.status}
              </span>
              <button
                type="button"
                disabled={!canManage}
                aria-label={`Download ${inv.id}`}
                className="text-ink-mute hover:text-ink rounded-md p-1.5 transition-colors disabled:opacity-50"
              >
                <Download size={14} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Payment method card ────────────────────────────────────────────

function PaymentMethodCard({
  card,
  canManage,
  onManage,
}: {
  card: StoredCard | null;
  canManage: boolean;
  onManage: () => void;
}) {
  return (
    <div className="bg-surface border-border mb-5 rounded-2xl border p-7 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-ink-mute mb-1 text-[10px] font-semibold uppercase tracking-[0.06em]">
            Payment method
          </div>
          {card ? (
            <>
              <div className="flex flex-wrap items-baseline gap-3">
                <span
                  className="display text-ink text-[20px] font-medium md:text-[22px]"
                  style={{ letterSpacing: "-0.015em" }}
                >
                  {card.brand} ···· {card.last4}
                </span>
                <span className="text-ink-mute font-mono text-[12px]">
                  exp {card.expMonth.padStart(2, "0")}/{card.expYear.slice(-2)}
                </span>
              </div>
              <div className="text-ink-soft mt-1 text-[13px] font-medium">
                {card.name} · {card.zip}
              </div>
            </>
          ) : (
            <p
              className="text-ink-soft m-0 text-[14px] font-medium"
              style={{ letterSpacing: "-0.005em" }}
            >
              No card on file. Add one to keep your subscription active.
            </p>
          )}
        </div>
        <PillButton variant="outline" size="sm" onClick={onManage} disabled={!canManage}>
          {card ? "Update" : "Add card"}
        </PillButton>
      </div>
    </div>
  );
}

// ─── Payment method modal ───────────────────────────────────────────

function PaymentMethodModal({
  card,
  onClose,
  onSave,
  onRemove,
}: {
  card: StoredCard | null;
  onClose: () => void;
  onSave: (card: StoredCard) => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(card?.name ?? "");
  const [number, setNumber] = useState("");
  const [expMonth, setExpMonth] = useState(card?.expMonth ?? "");
  const [expYear, setExpYear] = useState(card?.expYear ?? "");
  const [cvc, setCvc] = useState("");
  const [zip, setZip] = useState(card?.zip ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function handleSave() {
    const digits = number.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) {
      setError("Enter a valid card number.");
      return;
    }
    if (!name.trim()) {
      setError("Enter the name on the card.");
      return;
    }
    const monthNum = Number(expMonth);
    if (!monthNum || monthNum < 1 || monthNum > 12) {
      setError("Expiration month must be 01–12.");
      return;
    }
    if (!/^\d{2}|\d{4}$/.test(expYear) || expYear.length < 2) {
      setError("Enter the expiration year.");
      return;
    }
    if (cvc && !/^\d{3,4}$/.test(cvc)) {
      setError("CVC should be 3 or 4 digits.");
      return;
    }
    onSave({
      brand: detectBrand(digits),
      last4: digits.slice(-4),
      name: name.trim(),
      expMonth: String(monthNum),
      expYear: expYear,
      zip: zip.trim(),
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface border-border w-full max-w-[480px] rounded-2xl border p-6 shadow-xl md:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2
              id="payment-modal-title"
              className="display text-ink m-0 text-[22px] font-medium md:text-[24px]"
              style={{ letterSpacing: "-0.015em" }}
            >
              {card ? "Update payment method" : "Add a card"}
            </h2>
            <p
              className="text-ink-mute mt-1 text-[12px] font-medium"
              style={{ letterSpacing: "-0.005em" }}
            >
              <Lock size={11} strokeWidth={2} className="text-ink-mute mr-1 inline" />
              CVC isn&apos;t stored. Card data ships to a payment processor in production.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ink-mute hover:text-ink rounded-md p-1 transition-colors"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Name on card" htmlFor="pm-name">
            <Input
              id="pm-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sara Ahmed"
              autoComplete="cc-name"
            />
          </Field>

          <Field
            label="Card number"
            htmlFor="pm-number"
            hint={
              card
                ? `Replacing ${card.brand} ···· ${card.last4}`
                : "Visa, Mastercard, Amex, Discover"
            }
          >
            <Input
              id="pm-number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="4242 4242 4242 4242"
              inputMode="numeric"
              autoComplete="cc-number"
              maxLength={23}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Month" htmlFor="pm-mm">
              <Input
                id="pm-mm"
                value={expMonth}
                onChange={(e) => setExpMonth(e.target.value)}
                placeholder="MM"
                inputMode="numeric"
                maxLength={2}
                autoComplete="cc-exp-month"
              />
            </Field>
            <Field label="Year" htmlFor="pm-yy">
              <Input
                id="pm-yy"
                value={expYear}
                onChange={(e) => setExpYear(e.target.value)}
                placeholder="YYYY"
                inputMode="numeric"
                maxLength={4}
                autoComplete="cc-exp-year"
              />
            </Field>
            <Field label="CVC" htmlFor="pm-cvc">
              <Input
                id="pm-cvc"
                type="password"
                value={cvc}
                onChange={(e) => setCvc(e.target.value)}
                placeholder="123"
                inputMode="numeric"
                maxLength={4}
                autoComplete="cc-csc"
              />
            </Field>
          </div>

          <Field label="Billing ZIP / postal code" htmlFor="pm-zip">
            <Input
              id="pm-zip"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="94102"
              autoComplete="postal-code"
            />
          </Field>

          {error ? (
            <p className="text-rose m-0 text-[13px] font-medium" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {card ? (
              <button
                type="button"
                onClick={onRemove}
                className="text-rose hover:text-rose inline-flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
              >
                <Trash2 size={13} strokeWidth={2} /> Remove card
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <PillButton variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </PillButton>
              <PillButton variant="primary" size="sm" onClick={handleSave}>
                {card ? "Save changes" : "Add card"}
              </PillButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
