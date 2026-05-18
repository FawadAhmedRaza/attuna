"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, MapPin, Plus } from "lucide-react";

import { PillButton } from "@attuna/ui/PillButton";

import { getAllClients } from "../clients/_mock";
import { PageHeader } from "../_components/PageHeader";

import { EditSessionModal } from "./EditSessionModal";
import { getUpcomingSessions, type Session } from "./_mock";

type Overlay = {
  edits: Record<string, Session>;
  deleted: string[];
  added: Session[];
};

const OVERLAY_STORAGE_KEY = "attuna_calendar_overlay_v1";

function loadOverlay(): Overlay {
  if (typeof window === "undefined") return { edits: {}, deleted: [], added: [] };
  try {
    const raw = window.localStorage.getItem(OVERLAY_STORAGE_KEY);
    if (!raw) return { edits: {}, deleted: [], added: [] };
    const parsed = JSON.parse(raw) as Partial<Overlay>;
    return {
      edits: parsed.edits ?? {},
      deleted: parsed.deleted ?? [],
      added: parsed.added ?? [],
    };
  } catch {
    return { edits: {}, deleted: [], added: [] };
  }
}

type ModalState =
  | { mode: "closed" }
  | { mode: "create"; defaultDate: string }
  | { mode: "edit"; session: Session };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function CalendarView() {
  // Anchor everything to "now" computed on the client. Computing it on render
  // keeps the calendar fresh whenever a therapist returns to it.
  const [now] = useState<Date>(() => new Date());
  const [overlay, setOverlay] = useState<Overlay>(() => ({ edits: {}, deleted: [], added: [] }));
  const [overlayHydrated, setOverlayHydrated] = useState(false);
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });

  // Hydrate from localStorage after mount so SSR markup matches the client.
  useEffect(() => {
    setOverlay(loadOverlay());
    setOverlayHydrated(true);
  }, []);

  // Persist on change, but only after hydration so we don't clobber stored
  // state with the empty initial value.
  useEffect(() => {
    if (!overlayHydrated) return;
    try {
      window.localStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(overlay));
    } catch {}
  }, [overlay, overlayHydrated]);

  const clients = useMemo(
    () =>
      getAllClients().map((c) => ({
        id: c.id,
        name: c.name,
        initial: c.initial,
      })),
    [],
  );

  const sessions = useMemo(() => {
    const base = getUpcomingSessions(now);
    const deleted = new Set(overlay.deleted);
    const merged: Session[] = [];
    for (const s of base) {
      if (deleted.has(s.id)) continue;
      merged.push(overlay.edits[s.id] ?? s);
    }
    for (const s of overlay.added) merged.push(s);
    return merged;
  }, [now, overlay]);

  const byDate = useMemo(() => groupByDate(sessions), [sessions]);

  // Native HTML5 drag-and-drop. dragOverKey is the cell currently under the
  // cursor (used purely for visual feedback). draggingId is the session being
  // dragged — we keep it so the source cell doesn't paint itself as a target.
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function handleChipDragStart(e: React.DragEvent<HTMLButtonElement>, session: Session) {
    e.dataTransfer.setData("text/plain", session.id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(session.id);
  }

  function handleChipDragEnd() {
    setDraggingId(null);
    setDragOverKey(null);
  }

  function handleCellDragOver(e: React.DragEvent<HTMLDivElement>, key: string) {
    if (!draggingId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverKey !== key) setDragOverKey(key);
  }

  function handleCellDragLeave(key: string) {
    if (dragOverKey === key) setDragOverKey(null);
  }

  function handleCellDrop(e: React.DragEvent<HTMLDivElement>, key: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    setDragOverKey(null);
    setDraggingId(null);
    if (!id) return;
    const session = sessions.find((s) => s.id === id);
    if (!session || session.date === key) return;
    saveSession({ ...session, date: key });
  }

  // Calendar cursor — controls which month is rendered. Starts on the month
  // containing today.
  const [cursor, setCursor] = useState<{ year: number; month: number }>(() => ({
    year: now.getFullYear(),
    month: now.getMonth(),
  }));
  const [selected, setSelected] = useState<string>(() => dateKey(now));

  // If the user navigates a month away, snap the agenda selection to the first
  // day of that month so the right pane stays in sync with the visible grid.
  useEffect(() => {
    const selectedDate = parseDateKey(selected);
    if (selectedDate.getFullYear() !== cursor.year || selectedDate.getMonth() !== cursor.month) {
      setSelected(dateKey(new Date(cursor.year, cursor.month, 1)));
    }
  }, [cursor, selected]);

  const cells = useMemo(() => buildMonthCells(cursor.year, cursor.month), [cursor]);
  const todayKey = dateKey(now);
  const selectedSessions = (byDate[selected] ?? [])
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time));
  const upcoming = useMemo(() => upcomingSessions(sessions, now), [sessions, now]);

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const next = new Date(c.year, c.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function jumpToToday() {
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
    setSelected(todayKey);
  }

  function saveSession(s: Session) {
    setOverlay((o) => {
      // If this is an added session, replace it in `added` rather than
      // recording it as an edit — keeps the overlay shape clean.
      if (o.added.some((a) => a.id === s.id)) {
        return { ...o, added: o.added.map((a) => (a.id === s.id ? s : a)) };
      }
      // If the user previously deleted this base session, clear that.
      const deleted = o.deleted.filter((id) => id !== s.id);
      return { ...o, edits: { ...o.edits, [s.id]: s }, deleted };
    });
    // Move the selected day to wherever the session now lives, so the user
    // immediately sees the result on the calendar.
    setSelected(s.date);
    setCursor({ year: Number(s.date.slice(0, 4)), month: Number(s.date.slice(5, 7)) - 1 });
  }

  function deleteSession(id: string) {
    setOverlay((o) => {
      if (o.added.some((a) => a.id === id)) {
        return { ...o, added: o.added.filter((a) => a.id !== id) };
      }
      const { [id]: _removed, ...restEdits } = o.edits;
      return {
        ...o,
        edits: restEdits,
        deleted: o.deleted.includes(id) ? o.deleted : [...o.deleted, id],
      };
    });
  }

  function addNewSession(s: Session) {
    setOverlay((o) => ({ ...o, added: [...o.added, s] }));
    setSelected(s.date);
    setCursor({ year: Number(s.date.slice(0, 4)), month: Number(s.date.slice(5, 7)) - 1 });
  }

  function openCreate(forDate?: string) {
    setModal({ mode: "create", defaultDate: forDate ?? selected });
  }

  function openEdit(session: Session) {
    setModal({ mode: "edit", session });
  }

  function closeModal() {
    setModal({ mode: "closed" });
  }

  const monthLabel = `${MONTH_NAMES[cursor.month]} ${cursor.year}`;
  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        eyebrow="Schedule"
        title="Calendar"
        subtitle={`${sessions.length} sessions across the next four weeks.`}
        action={
          <>
            <PillButton variant="ghost" size="sm" onClick={jumpToToday} disabled={isCurrentMonth}>
              Today
            </PillButton>
            <PillButton variant="primary" size="sm" onClick={() => openCreate(selected)}>
              <Plus size={14} strokeWidth={1.75} /> New session
            </PillButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <section
          className="bg-surface border-border overflow-hidden rounded-2xl border"
          aria-label={`${monthLabel} calendar`}
        >
          <div className="border-border flex items-center justify-between border-b px-5 py-4 md:px-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
                className="text-ink-mute hover:text-ink hover:bg-bg-soft rounded-md p-1.5 transition-colors"
              >
                <ChevronLeft size={16} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
                className="text-ink-mute hover:text-ink hover:bg-bg-soft rounded-md p-1.5 transition-colors"
              >
                <ChevronRight size={16} strokeWidth={1.75} />
              </button>
            </div>
            <h2
              className="display text-ink m-0 text-[18px] font-medium md:text-[20px]"
              style={{ letterSpacing: "-0.015em" }}
            >
              {monthLabel}
            </h2>
            <div aria-hidden="true" className="w-[68px]" />
          </div>

          <div className="border-border-soft grid grid-cols-7 border-b">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="text-ink-mute px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.06em]"
              >
                {wd}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              const key = dateKey(cell.date);
              const dayEvents = byDate[key] ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selected;
              const inMonth = cell.inMonth;
              const isDropTarget = dragOverKey === key && draggingId !== null;
              return (
                <div
                  key={`${key}-${i}`}
                  onDragOver={(e) => handleCellDragOver(e, key)}
                  onDragLeave={() => handleCellDragLeave(key)}
                  onDrop={(e) => handleCellDrop(e, key)}
                  className={[
                    "border-border-soft relative flex min-h-[96px] flex-col gap-1 border-b border-r p-2 transition-colors md:min-h-[110px]",
                    inMonth ? "bg-surface" : "bg-bg-soft",
                    isSelected ? "ring-accent z-10 ring-2 ring-inset" : "",
                    isDropTarget ? "bg-accent-bg ring-warm z-10 ring-2 ring-inset" : "",
                    i % 7 === 6 ? "border-r-0" : "",
                    i >= cells.length - 7 ? "border-b-0" : "",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={() => setSelected(key)}
                    aria-pressed={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={`Select ${cell.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}`}
                    className="hover:bg-bg-soft -m-1 flex items-center justify-between rounded-md p-1 text-left transition-colors"
                  >
                    <span
                      className={[
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold",
                        isToday
                          ? "bg-accent text-ink-on-accent"
                          : inMonth
                            ? "text-ink"
                            : "text-ink-faint",
                      ].join(" ")}
                    >
                      {cell.date.getDate()}
                    </span>
                    {dayEvents.length > 0 ? (
                      <span className="text-ink-mute font-mono text-[10px]">
                        {dayEvents.length}
                      </span>
                    ) : null}
                  </button>
                  <div className="flex flex-col gap-0.5">
                    {dayEvents.slice(0, 2).map((s) => (
                      <EventChip
                        key={s.id}
                        session={s}
                        isDragging={draggingId === s.id}
                        onClick={() => {
                          setSelected(key);
                          openEdit(s);
                        }}
                        onDragStart={(e) => handleChipDragStart(e, s)}
                        onDragEnd={handleChipDragEnd}
                      />
                    ))}
                    {dayEvents.length > 2 ? (
                      <button
                        type="button"
                        onClick={() => setSelected(key)}
                        className="text-ink-mute hover:text-ink-soft -mx-1 rounded px-1 text-left text-[10px] font-medium transition-colors"
                      >
                        +{dayEvents.length - 2} more
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <DayPanel
            dateKeyValue={selected}
            sessions={selectedSessions}
            todayKey={todayKey}
            onEdit={openEdit}
            onCreate={() => openCreate(selected)}
          />
          <UpcomingPanel sessions={upcoming} />
        </aside>
      </div>

      <EditSessionModal
        open={modal.mode !== "closed"}
        mode={modal.mode === "edit" ? "edit" : "create"}
        session={modal.mode === "edit" ? modal.session : null}
        defaultDate={modal.mode === "create" ? modal.defaultDate : undefined}
        clients={clients}
        onClose={closeModal}
        onSave={(s) => {
          if (modal.mode === "create") addNewSession(s);
          else saveSession(s);
        }}
        onDelete={modal.mode === "edit" ? deleteSession : undefined}
      />
    </div>
  );
}

function EventChip({
  session,
  isDragging,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  session: Session;
  isDragging: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={`Drag to reschedule, click to edit · ${formatTime(session.time)} ${session.clientName}`}
      aria-label={`Edit ${formatTime(session.time)} session with ${session.clientName}`}
      className={[
        "bg-accent-bg text-accent hover:bg-accent hover:text-ink-on-accent inline-flex cursor-grab items-center gap-1 truncate rounded-[6px] px-1.5 py-0.5 text-left text-[10px] font-semibold transition-colors active:cursor-grabbing",
        isDragging ? "opacity-40" : "",
      ].join(" ")}
    >
      <span className="font-mono text-[9px] opacity-80">{formatTime(session.time)}</span>
      <span className="truncate">{session.clientName}</span>
    </button>
  );
}

function DayPanel({
  dateKeyValue,
  sessions,
  todayKey,
  onEdit,
  onCreate,
}: {
  dateKeyValue: string;
  sessions: Session[];
  todayKey: string;
  onEdit: (session: Session) => void;
  onCreate: () => void;
}) {
  const d = parseDateKey(dateKeyValue);
  const heading = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const eyebrow = dateKeyValue === todayKey ? "Today" : null;

  return (
    <section className="bg-surface border-border rounded-2xl border p-5 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <div className="text-accent mb-1 text-[10px] font-semibold uppercase tracking-[0.06em]">
              {eyebrow}
            </div>
          ) : null}
          <h2
            className="display text-ink m-0 text-[18px] font-medium md:text-[20px]"
            style={{ letterSpacing: "-0.015em" }}
          >
            {heading}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCreate}
          aria-label="Add session for this day"
          className="text-ink-mute hover:text-ink hover:bg-bg-soft rounded-full p-1.5 transition-colors"
        >
          <Plus size={16} strokeWidth={1.75} />
        </button>
      </div>

      {sessions.length === 0 ? (
        <button
          type="button"
          onClick={onCreate}
          className="border-border-soft text-ink-mute hover:border-accent hover:text-ink-soft flex w-full items-center justify-center gap-2 rounded-[12px] border border-dashed py-5 text-[13px] font-medium transition-colors"
        >
          <Plus size={14} strokeWidth={1.75} />
          Add a session
        </button>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {sessions.map((s) => (
            <li key={s.id}>
              <SessionRow session={s} onEdit={() => onEdit(s)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function UpcomingPanel({ sessions }: { sessions: Session[] }) {
  const params = useParams<{ slug: string }>();
  if (sessions.length === 0) return null;
  return (
    <section className="bg-surface border-border rounded-2xl border p-5 md:p-6">
      <h3
        className="display text-ink m-0 mb-3 text-[16px] font-medium"
        style={{ letterSpacing: "-0.012em" }}
      >
        Coming up
      </h3>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {sessions.map((s) => (
          <li key={s.id}>
            <Link
              href={`/w/${params.slug}/clients/${s.clientId}`}
              className="border-border-soft hover:border-accent flex items-center gap-3 rounded-[12px] border px-3 py-2.5 transition-colors"
            >
              <div className="display bg-surface-deep text-ink-soft flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-medium">
                {s.initial}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="text-ink truncate text-[13px] font-semibold"
                  style={{ letterSpacing: "-0.005em" }}
                >
                  {s.clientName}
                </div>
                <div className="text-ink-mute text-[11px] font-medium">
                  {shortDateLabel(s.date)} · {formatTime(s.time)}
                </div>
              </div>
              {s.briefReady ? (
                <span className="bg-accent-bg text-accent inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                  Brief
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SessionRow({ session, onEdit }: { session: Session; onEdit: () => void }) {
  const params = useParams<{ slug: string }>();
  return (
    <div className="bg-bg-soft border-border-soft hover:border-accent group flex items-start gap-3 rounded-[12px] border px-3 py-3 transition-colors">
      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-start gap-3 text-left"
        aria-label={`Edit session with ${session.clientName}`}
      >
        <div className="text-ink w-[68px] flex-shrink-0 font-mono text-[12px] font-semibold">
          {formatTime(session.time)}
        </div>
        <div className="display bg-surface-deep text-ink-soft flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-medium">
          {session.initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-ink text-[14px] font-semibold" style={{ letterSpacing: "-0.005em" }}>
            {session.clientName}
          </div>
          <div className="text-ink-mute mt-0.5 flex items-center gap-2 text-[11px] font-medium">
            <span>{session.duration} min</span>
            {session.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin size={10} strokeWidth={1.75} />
                {session.location}
              </span>
            ) : null}
          </div>
        </div>
      </button>
      <div className="flex flex-shrink-0 items-center gap-1.5">
        {session.briefReady ? (
          <span className="bg-accent-bg text-accent inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold">
            Brief
          </span>
        ) : null}
        <Link
          href={`/w/${params.slug}/clients/${session.clientId}`}
          aria-label={`Open ${session.clientName}'s client page`}
          className="text-ink-mute hover:text-ink hover:bg-surface rounded-full p-1 transition-colors"
        >
          <ChevronRight size={14} strokeWidth={1.75} />
        </Link>
      </div>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map((n) => Number(n));
  return new Date(y!, m! - 1, d!);
}

function groupByDate(sessions: Session[]): Record<string, Session[]> {
  const out: Record<string, Session[]> = {};
  for (const s of sessions) {
    (out[s.date] ??= []).push(s);
  }
  for (const key of Object.keys(out)) {
    out[key]!.sort((a, b) => a.time.localeCompare(b.time));
  }
  return out;
}

function buildMonthCells(year: number, month: number): { date: Date; inMonth: boolean }[] {
  const firstOfMonth = new Date(year, month, 1);
  const startDow = firstOfMonth.getDay(); // Sun = 0
  const gridStart = new Date(year, month, 1 - startDow);
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    cells.push({ date: d, inMonth: d.getMonth() === month });
  }
  return cells;
}

function upcomingSessions(sessions: Session[], now: Date): Session[] {
  const todayKey = dateKey(now);
  return sessions
    .filter((s) => s.date >= todayKey)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 5);
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map((n) => Number(n));
  if (h == null || m == null) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const display = ((h + 11) % 12) + 1;
  return `${display}:${String(m).padStart(2, "0")} ${period}`;
}

function shortDateLabel(key: string): string {
  const d = parseDateKey(key);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default CalendarView;
