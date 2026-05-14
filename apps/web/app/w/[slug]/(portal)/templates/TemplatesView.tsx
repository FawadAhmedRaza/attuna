"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Heart,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { Field } from "@attuna/ui/Field";
import { Input } from "@attuna/ui/Input";
import { PillButton } from "@attuna/ui/PillButton";
import { Textarea } from "@attuna/ui/Textarea";

import { PageHeader } from "../_components/PageHeader";

type Template = {
  id: string;
  name: string;
  theme: string;
  body: string;
  iconKey?: keyof typeof ICONS;
  builtIn: boolean;
};

const ICONS = {
  alert: AlertCircle,
  heart: Heart,
  users: Users,
  book: BookOpen,
  spark: Sparkles,
} satisfies Record<string, LucideIcon>;

const ICON_LIST: { key: keyof typeof ICONS; label: string }[] = [
  { key: "spark", label: "Sparkle" },
  { key: "alert", label: "Alert" },
  { key: "heart", label: "Heart" },
  { key: "users", label: "Users" },
  { key: "book", label: "Book" },
];

const BUILT_IN: Template[] = [
  {
    id: "tpl_anxiety",
    name: "Anxiety check-in",
    theme: "anxiety",
    iconKey: "alert",
    body: "I noticed [observation]. When tightness shows up this week, would it feel possible to pause for two breaths and name what's underneath — not solve it, just name it? You can write me a sentence about what you found.",
    builtIn: true,
  },
  {
    id: "tpl_grief",
    name: "Grief journaling",
    theme: "grief",
    iconKey: "heart",
    body: "Some days grief feels close, some days it goes quiet for a while. If today it shows up, what does it ask of you? Write a few sentences — there's no right answer, only what's true today.",
    builtIn: true,
  },
  {
    id: "tpl_couples",
    name: "Couples preparation",
    theme: "couples",
    iconKey: "users",
    body: "Before our next session, take five minutes to jot one moment from this week when you felt close to your partner, and one moment that felt distant. Bring both — we'll sit with them gently.",
    builtIn: true,
  },
  {
    id: "tpl_depression",
    name: "Depression structure",
    theme: "depression",
    iconKey: "book",
    body: "On low-energy days, can you choose one anchor — something small — that marks the start of the day? It can be opening the curtains, making tea, sitting outside for two minutes. Notice what shifts, if anything.",
    builtIn: true,
  },
  {
    id: "tpl_post_event",
    name: "Post-event reflection",
    theme: "reflection",
    iconKey: "spark",
    body: "Sometime in the next 24 hours, write a brief note about what stood out from [event]. Not to evaluate it — just to capture what your nervous system noticed. We'll explore together next session.",
    builtIn: true,
  },
];

const CLIENTS = [
  { id: "maya", name: "Maya R.", initial: "M" },
  { id: "james", name: "James K.", initial: "J" },
  { id: "aisha", name: "Aisha P.", initial: "A" },
  { id: "devon", name: "Devon N.", initial: "D" },
];

const CUSTOM_KEY = "attuna_templates_v1";
const USAGE_KEY = "attuna_template_usage_v1";
const SENT_KEY = "attuna_sent_template_uses_v1";

type SentLog = {
  id: string;
  templateId: string;
  templateName: string;
  clientId: string;
  clientName: string;
  body: string;
  scheduledFor: string;
  sentAt: number;
};

function loadCustom(): Template[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]") as Template[];
  } catch {
    return [];
  }
}

function saveCustom(list: Template[]) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  } catch {}
}

function loadUsage(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(USAGE_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function saveUsage(map: Record<string, number>) {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(map));
  } catch {}
}

function logUse(entry: SentLog) {
  try {
    const raw = localStorage.getItem(SENT_KEY);
    const list = (raw ? JSON.parse(raw) : []) as SentLog[];
    list.unshift(entry);
    localStorage.setItem(SENT_KEY, JSON.stringify(list.slice(0, 200)));
  } catch {}
}

type ModalState =
  | { kind: "none" }
  | { kind: "preview"; template: Template }
  | { kind: "use"; template: Template }
  | { kind: "edit"; template: Template | null };

export function TemplatesView() {
  const [custom, setCustom] = useState<Template[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [recentlySent, setRecentlySent] = useState<string | null>(null);

  useEffect(() => {
    setCustom(loadCustom());
    setUsage(loadUsage());
  }, []);

  const all = useMemo(() => [...BUILT_IN, ...custom], [custom]);

  function bumpUsage(id: string) {
    const next = { ...usage, [id]: (usage[id] ?? 0) + 1 };
    setUsage(next);
    saveUsage(next);
  }

  function handleSent(template: Template, clientId: string, body: string, scheduledFor: string) {
    const client = CLIENTS.find((c) => c.id === clientId);
    if (!client) return;
    bumpUsage(template.id);
    logUse({
      id: `use_${Date.now()}`,
      templateId: template.id,
      templateName: template.name,
      clientId,
      clientName: client.name,
      body,
      scheduledFor,
      sentAt: Date.now(),
    });
    setRecentlySent(
      `${template.name} → ${client.name}${scheduledFor ? ` · scheduled ${scheduledFor}` : ""}`,
    );
    setModal({ kind: "none" });
    setTimeout(() => setRecentlySent(null), 3500);
  }

  function handleSaveTemplate(t: Template, isNew: boolean) {
    if (isNew) {
      const next = [t, ...custom];
      setCustom(next);
      saveCustom(next);
    } else {
      const next = custom.map((c) => (c.id === t.id ? t : c));
      setCustom(next);
      saveCustom(next);
    }
    setModal({ kind: "none" });
  }

  function handleDelete(template: Template) {
    if (template.builtIn) return;
    const next = custom.filter((c) => c.id !== template.id);
    setCustom(next);
    saveCustom(next);
    const { [template.id]: _removed, ...rest } = usage;
    void _removed;
    setUsage(rest);
    saveUsage(rest);
    setModal({ kind: "none" });
  }

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="Reusable patterns"
        title="Templates"
        subtitle="Reusable suggestions across your practice."
        action={
          <PillButton
            variant="primary"
            size="sm"
            onClick={() => setModal({ kind: "edit", template: null })}
          >
            <Plus size={14} strokeWidth={1.75} /> New template
          </PillButton>
        }
      />

      {recentlySent ? (
        <div className="bg-accent-bg text-accent border-accent mb-5 rounded-2xl border px-5 py-3 text-[13px] font-semibold">
          ✓ Sent: {recentlySent}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {all.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            usage={usage[t.id] ?? 0}
            onPreview={() => setModal({ kind: "preview", template: t })}
            onUse={() => setModal({ kind: "use", template: t })}
          />
        ))}
      </div>

      {all.length === 0 ? (
        <div className="bg-surface border-border rounded-2xl border p-8 text-center">
          <p className="text-ink-soft text-[14px]">No templates yet. Create your first.</p>
        </div>
      ) : null}

      {modal.kind === "preview" ? (
        <PreviewModal
          template={modal.template}
          usage={usage[modal.template.id] ?? 0}
          onClose={() => setModal({ kind: "none" })}
          onUse={() => setModal({ kind: "use", template: modal.template })}
          onEdit={() => setModal({ kind: "edit", template: modal.template })}
          onDelete={() => handleDelete(modal.template)}
        />
      ) : null}

      {modal.kind === "use" ? (
        <UseModal
          template={modal.template}
          onClose={() => setModal({ kind: "none" })}
          onSend={(clientId, body, scheduledFor) =>
            handleSent(modal.template, clientId, body, scheduledFor)
          }
        />
      ) : null}

      {modal.kind === "edit" ? (
        <EditModal
          template={modal.template}
          onClose={() => setModal({ kind: "none" })}
          onSave={handleSaveTemplate}
          onDelete={modal.template ? () => handleDelete(modal.template!) : undefined}
        />
      ) : null}
    </div>
  );
}

function TemplateCard({
  template,
  usage,
  onPreview,
  onUse,
}: {
  template: Template;
  usage: number;
  onPreview: () => void;
  onUse: () => void;
}) {
  const Icon = template.iconKey ? ICONS[template.iconKey] : Sparkles;
  return (
    <article className="bg-surface border-border flex flex-col gap-4 rounded-2xl border px-6 py-6 md:px-7">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onPreview}
          className="min-w-0 flex-1 text-left"
          aria-label={`Preview ${template.name}`}
        >
          <Icon size={18} strokeWidth={1.75} className="text-accent mb-3" />
          <h3
            className="display text-ink m-0 mb-1 text-[18px] font-semibold md:text-[19px]"
            style={{ letterSpacing: "-0.015em" }}
          >
            {template.name}
          </h3>
          <p
            className="text-ink-soft m-0 line-clamp-2 text-[13px] font-medium"
            style={{ letterSpacing: "-0.005em", lineHeight: 1.5 }}
          >
            {template.body}
          </p>
        </button>
      </div>

      <div className="border-border-soft flex items-center justify-between gap-3 border-t pt-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <span className="bg-bg-soft border-border text-ink-soft inline-flex items-center rounded-full border px-2.5 py-1">
            {template.theme}
          </span>
          {!template.builtIn ? (
            <span className="text-ink-mute font-mono text-[10px] uppercase tracking-[0.06em]">
              custom
            </span>
          ) : null}
          <span className="text-ink-mute font-mono text-[11px]">used {usage}×</span>
        </div>
        <button
          type="button"
          onClick={onUse}
          className="text-accent hover:text-accent-deep inline-flex items-center gap-1 text-[13px] font-semibold transition-colors"
        >
          Use →
        </button>
      </div>
    </article>
  );
}

// ─── Preview modal ─────────────────────────────────────────────────

function PreviewModal({
  template,
  usage,
  onClose,
  onUse,
  onEdit,
  onDelete,
}: {
  template: Template;
  usage: number;
  onClose: () => void;
  onUse: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  useEscClose(onClose);
  const Icon = template.iconKey ? ICONS[template.iconKey] : Sparkles;

  return (
    <ModalShell onClose={onClose} labelledBy="preview-title">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="bg-accent-bg flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[10px]">
            <Icon size={18} strokeWidth={1.75} className="text-accent" />
          </div>
          <div>
            <h2
              id="preview-title"
              className="display text-ink m-0 text-[22px] font-medium md:text-[24px]"
              style={{ letterSpacing: "-0.015em" }}
            >
              {template.name}
            </h2>
            <div className="text-ink-mute mt-1 flex items-center gap-2 text-[12px] font-medium">
              <span className="bg-bg-soft border-border inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold">
                {template.theme}
              </span>
              <span className="font-mono text-[11px]">used {usage}×</span>
              {template.builtIn ? <span className="font-mono text-[11px]">· built-in</span> : null}
            </div>
          </div>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      <div className="bg-bg-soft border-border-soft mb-6 rounded-[10px] border p-5">
        <p
          className="display-md text-ink m-0 whitespace-pre-wrap text-[15px] font-normal md:text-[16px]"
          style={{ letterSpacing: "-0.003em", lineHeight: 1.6 }}
        >
          {template.body}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {!template.builtIn ? (
          <button
            type="button"
            onClick={onDelete}
            className="text-rose hover:text-rose inline-flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
          >
            <Trash2 size={13} strokeWidth={2} /> Delete
          </button>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap gap-2">
          {!template.builtIn ? (
            <PillButton variant="ghost" size="sm" onClick={onEdit}>
              <Pencil size={13} strokeWidth={1.75} /> Edit
            </PillButton>
          ) : null}
          <PillButton variant="primary" size="sm" onClick={onUse}>
            Use template →
          </PillButton>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Use modal (send to client) ────────────────────────────────────

function UseModal({
  template,
  onClose,
  onSend,
}: {
  template: Template;
  onClose: () => void;
  onSend: (clientId: string, body: string, scheduledFor: string) => void;
}) {
  useEscClose(onClose);
  const [clientId, setClientId] = useState(CLIENTS[0]!.id);
  const [body, setBody] = useState(template.body);
  const [scheduledFor, setScheduledFor] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!clientId) return setError("Pick a client.");
    if (!body.trim()) return setError("The message can't be empty.");
    setError(null);
    onSend(clientId, body.trim(), scheduledFor);
  }

  return (
    <ModalShell onClose={onClose} labelledBy="use-title">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2
            id="use-title"
            className="display text-ink m-0 text-[22px] font-medium md:text-[24px]"
            style={{ letterSpacing: "-0.015em" }}
          >
            Send to a client
          </h2>
          <p
            className="text-ink-mute mt-1 text-[12px] font-medium"
            style={{ letterSpacing: "-0.005em" }}
          >
            From the {template.name} template. You can edit before sending.
          </p>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      <div className="flex flex-col gap-4">
        <Field label="Client">
          <div className="flex flex-wrap gap-2">
            {CLIENTS.map((c) => {
              const active = c.id === clientId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setClientId(c.id)}
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-accent text-ink-on-accent border-accent"
                      : "bg-surface border-border text-ink-soft hover:text-ink",
                  ].join(" ")}
                  aria-pressed={active}
                >
                  <span
                    className={[
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                      active ? "bg-ink-on-accent text-accent" : "bg-surface-deep text-ink-mute",
                    ].join(" ")}
                  >
                    {c.initial}
                  </span>
                  {c.name}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Message" htmlFor="use-body" hint="Speak as you would to your client.">
          <Textarea id="use-body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>

        <Field label="Schedule for" htmlFor="use-when" hint="Leave blank to send now">
          <Input
            id="use-when"
            type="date"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
          />
        </Field>

        {error ? (
          <p className="text-rose m-0 text-[13px] font-medium" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-2 flex justify-end gap-2">
          <PillButton variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton variant="primary" size="sm" onClick={submit}>
            <Send size={14} strokeWidth={1.75} />
            {scheduledFor ? "Schedule" : "Send"}
          </PillButton>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Edit / Create modal ───────────────────────────────────────────

function EditModal({
  template,
  onClose,
  onSave,
  onDelete,
}: {
  template: Template | null;
  onClose: () => void;
  onSave: (t: Template, isNew: boolean) => void;
  onDelete?: () => void;
}) {
  useEscClose(onClose);
  const isNew = template === null;
  const [name, setName] = useState(template?.name ?? "");
  const [theme, setTheme] = useState(template?.theme ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [iconKey, setIconKey] = useState<keyof typeof ICONS>(template?.iconKey ?? "spark");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!name.trim()) return setError("Give the template a name.");
    if (!body.trim()) return setError("Add the message body.");
    setError(null);
    const next: Template = {
      id: template?.id ?? `tpl_${Date.now()}`,
      name: name.trim(),
      theme: theme.trim() || "general",
      body: body.trim(),
      iconKey,
      builtIn: false,
    };
    onSave(next, isNew);
  }

  return (
    <ModalShell onClose={onClose} labelledBy="edit-title">
      <div className="mb-5 flex items-start justify-between gap-3">
        <h2
          id="edit-title"
          className="display text-ink m-0 text-[22px] font-medium md:text-[24px]"
          style={{ letterSpacing: "-0.015em" }}
        >
          {isNew ? "New template" : "Edit template"}
        </h2>
        <CloseButton onClose={onClose} />
      </div>

      <div className="flex flex-col gap-4">
        <Field label="Name" htmlFor="ed-name">
          <Input
            id="ed-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Pre-session reflection"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Theme" htmlFor="ed-theme" hint="Short tag, e.g. anxiety">
            <Input
              id="ed-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="anxiety"
            />
          </Field>
          <Field label="Icon">
            <div className="flex flex-wrap gap-2">
              {ICON_LIST.map(({ key, label }) => {
                const I = ICONS[key];
                const active = iconKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIconKey(key)}
                    aria-label={label}
                    aria-pressed={active}
                    className={[
                      "inline-flex h-9 w-9 items-center justify-center rounded-[10px] border transition-colors",
                      active
                        ? "bg-accent-bg border-accent text-accent"
                        : "bg-surface border-border text-ink-mute hover:text-ink",
                    ].join(" ")}
                  >
                    <I size={16} strokeWidth={1.75} />
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <Field label="Body" htmlFor="ed-body" hint="What the client receives.">
          <Textarea
            id="ed-body"
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="A gentle prompt — calm, observational, never directive."
          />
        </Field>

        {error ? (
          <p className="text-rose m-0 text-[13px] font-medium" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {!isNew && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="text-rose hover:text-rose inline-flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
            >
              <Trash2 size={13} strokeWidth={2} /> Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <PillButton variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </PillButton>
            <PillButton variant="primary" size="sm" onClick={submit}>
              {isNew ? "Create template" : "Save changes"}
            </PillButton>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Modal helpers ─────────────────────────────────────────────────

function ModalShell({
  onClose,
  labelledBy,
  children,
}: {
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface border-border w-full max-w-[560px] rounded-2xl border p-6 shadow-xl md:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="text-ink-mute hover:text-ink rounded-md p-1 transition-colors"
    >
      <X size={18} strokeWidth={1.75} />
    </button>
  );
}

function useEscClose(onClose: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
}
