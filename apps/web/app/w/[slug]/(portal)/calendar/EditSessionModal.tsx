"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Save, Trash2, X } from "lucide-react";

import { Field } from "@attuna/ui/Field";
import { Input } from "@attuna/ui/Input";
import { PillButton } from "@attuna/ui/PillButton";

import type { Session } from "./_mock";

type ClientOption = {
  id: string;
  name: string;
  initial: string;
};

type EditSessionModalProps = {
  open: boolean;
  mode: "create" | "edit";
  session: Session | null;
  defaultDate?: string;
  clients: ClientOption[];
  onClose: () => void;
  onSave: (session: Session) => void;
  onDelete?: (id: string) => void;
};

const DURATIONS = [30, 45, 50, 60, 90];

export function EditSessionModal({
  open,
  mode,
  session,
  defaultDate,
  clients,
  onClose,
  onSave,
  onDelete,
}: EditSessionModalProps) {
  const initial = useMemo<Session>(
    () =>
      session ??
      blankSession({
        date: defaultDate ?? localDate(new Date()),
        client: clients[0],
      }),
    [session, defaultDate, clients],
  );

  const [clientId, setClientId] = useState(initial.clientId);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [duration, setDuration] = useState(initial.duration);
  const [location, setLocation] = useState(initial.location ?? "");
  const [briefReady, setBriefReady] = useState(initial.briefReady);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const firstInputRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!open) return;
    setClientId(initial.clientId);
    setDate(initial.date);
    setTime(initial.time);
    setDuration(initial.duration);
    setLocation(initial.location ?? "");
    setBriefReady(initial.briefReady);
    setError(null);
    setConfirmDelete(false);
  }, [open, initial]);

  useEffect(() => {
    if (open) firstInputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  function submit() {
    const client = clients.find((c) => c.id === clientId);
    if (!client) {
      setError("Pick a client.");
      return;
    }
    if (!date || !time) {
      setError("Pick a date and time.");
      return;
    }
    const next: Session = {
      id: initial.id,
      clientId: client.id,
      clientName: client.name,
      initial: client.initial,
      date,
      time,
      duration,
      location: location.trim() || undefined,
      briefReady,
    };
    onSave(next);
    onClose();
  }

  function handleDelete() {
    if (!onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(initial.id);
    onClose();
  }

  const heading = mode === "create" ? "New session" : "Edit session";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "color-mix(in oklab, var(--ink) 35%, transparent)" }}
      />
      <div className="bg-surface border-border relative w-full max-w-[520px] rounded-[20px] border p-7 shadow-2xl md:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-ink-mute hover:text-ink absolute right-4 top-4 rounded-full p-1.5 transition-colors"
        >
          <X size={16} strokeWidth={1.75} />
        </button>

        <h2
          id="session-modal-title"
          className="display text-ink m-0 mb-1.5 text-[24px] font-medium"
          style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
        >
          {heading}
        </h2>
        <p className="text-ink-soft tracking-body mb-6 text-[14px]" style={{ lineHeight: 1.55 }}>
          Saved here in Attuna. Push to Google Calendar separately if you want it on your calendar
          too.
        </p>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          noValidate
        >
          <Field label="Client" htmlFor="session-client">
            <select
              id="session-client"
              ref={firstInputRef}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="bg-bg-soft text-ink border-border focus:border-accent w-full rounded-[12px] border px-4 py-[13px] font-sans text-[14px] font-medium transition-[border-color] duration-200"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="session-date">
              <Input
                id="session-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Field>
            <Field label="Start time" htmlFor="session-time">
              <Input
                id="session-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </Field>
          </div>

          <Field label="Duration" htmlFor="session-duration">
            <div className="flex flex-wrap gap-2" id="session-duration">
              {DURATIONS.map((min) => {
                const active = min === duration;
                return (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setDuration(min)}
                    aria-pressed={active}
                    className={[
                      "inline-flex items-center rounded-[10px] border px-3.5 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-ink text-bg border-ink"
                        : "bg-surface text-ink-soft border-border hover:text-ink",
                    ].join(" ")}
                  >
                    {min} min
                  </button>
                );
              })}
            </div>
          </Field>

          <Field
            label="Location"
            htmlFor="session-location"
            hint="Office, Zoom, or address. Optional."
          >
            <Input
              id="session-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Zoom link, room number, etc."
            />
          </Field>

          <label className="border-border-soft bg-bg-soft flex cursor-pointer items-center justify-between gap-3 rounded-[12px] border px-4 py-3">
            <div>
              <div className="text-ink text-[13px] font-semibold">Brief ready</div>
              <div className="text-ink-mute text-[11px] font-medium">
                Show a &quot;Brief&quot; tag on this session.
              </div>
            </div>
            <input
              type="checkbox"
              checked={briefReady}
              onChange={(e) => setBriefReady(e.target.checked)}
              className="accent-accent h-4 w-4"
            />
          </label>

          {error ? (
            <p className="text-rose tracking-body text-[13px] font-medium" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            {mode === "edit" && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors",
                  confirmDelete
                    ? "bg-rose border-rose text-white"
                    : "text-rose border-rose/40 hover:bg-rose/5 bg-transparent",
                ].join(" ")}
              >
                <Trash2 size={13} strokeWidth={1.75} />
                {confirmDelete ? "Tap again to confirm" : "Delete"}
              </button>
            ) : (
              <span aria-hidden="true" />
            )}
            <div className="flex items-center gap-2">
              <PillButton variant="ghost" size="sm" type="button" onClick={onClose}>
                Cancel
              </PillButton>
              <PillButton variant="primary" size="md" type="submit">
                <Save size={14} strokeWidth={1.75} /> Save
              </PillButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function localDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function blankSession({
  date,
  client,
}: {
  date: string;
  client: ClientOption | undefined;
}): Session {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    clientId: client?.id ?? "",
    clientName: client?.name ?? "",
    initial: client?.initial ?? "?",
    date,
    time: "10:00",
    duration: 50,
    location: undefined,
    briefReady: false,
  };
}

export default EditSessionModal;
