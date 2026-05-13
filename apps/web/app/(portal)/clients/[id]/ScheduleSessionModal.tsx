"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus, Download, X } from "lucide-react";

import { Field } from "@attuna/ui/Field";
import { Input } from "@attuna/ui/Input";
import { PillButton } from "@attuna/ui/PillButton";
import { Textarea } from "@attuna/ui/Textarea";

type ScheduleSessionModalProps = {
  open: boolean;
  onClose: () => void;
  clientName: string;
};

const DURATION_OPTIONS = [30, 45, 50, 60, 90];

export function ScheduleSessionModal({ open, onClose, clientName }: ScheduleSessionModalProps) {
  const defaults = useMemo(() => defaultSlot(), []);
  const [title, setTitle] = useState(`Session — ${clientName}`);
  const [date, setDate] = useState(defaults.date);
  const [time, setTime] = useState(defaults.time);
  const [duration, setDuration] = useState<number>(50);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Reset when reopening so the modal feels fresh per session, but only when
  // the dialog opens — editing while open shouldn't clobber the user's input.
  useEffect(() => {
    if (!open) return;
    const fresh = defaultSlot();
    setTitle(`Session — ${clientName}`);
    setDate(fresh.date);
    setTime(fresh.time);
    setDuration(50);
    setLocation("");
    setNotes("");
    setError(null);
  }, [open, clientName]);

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

  function validate(): { startLocal: Date; endLocal: Date } | null {
    if (!title.trim()) {
      setError("Add a title.");
      return null;
    }
    if (!date || !time) {
      setError("Pick a date and time.");
      return null;
    }
    const startLocal = new Date(`${date}T${time}`);
    if (Number.isNaN(startLocal.getTime())) {
      setError("That date or time doesn't look right.");
      return null;
    }
    const endLocal = new Date(startLocal.getTime() + duration * 60_000);
    setError(null);
    return { startLocal, endLocal };
  }

  function openInGoogleCalendar() {
    const slot = validate();
    if (!slot) return;
    const url = buildGoogleCalendarUrl({
      title: title.trim(),
      start: slot.startLocal,
      end: slot.endLocal,
      details: notes.trim(),
      location: location.trim(),
    });
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  }

  function downloadIcs() {
    const slot = validate();
    if (!slot) return;
    const ics = buildIcs({
      title: title.trim(),
      start: slot.startLocal,
      end: slot.endLocal,
      details: notes.trim(),
      location: location.trim(),
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${slugify(title)}-${date}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-title"
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
          id="schedule-title"
          className="display text-ink m-0 mb-1.5 text-[24px] font-medium"
          style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
        >
          Schedule a session.
        </h2>
        <p className="text-ink-soft tracking-body mb-6 text-[14px]" style={{ lineHeight: 1.55 }}>
          Opens in your calendar — nothing is saved here. Edit the title if you&apos;d rather use
          initials.
        </p>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            openInGoogleCalendar();
          }}
          noValidate
        >
          <Field label="Title" htmlFor="schedule-title-input">
            <Input
              id="schedule-title-input"
              ref={firstInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="schedule-date">
              <Input
                id="schedule-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Field>
            <Field label="Start time" htmlFor="schedule-time">
              <Input
                id="schedule-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </Field>
          </div>

          <Field label="Duration" htmlFor="schedule-duration">
            <div className="flex flex-wrap gap-2" id="schedule-duration">
              {DURATION_OPTIONS.map((min) => {
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
            htmlFor="schedule-location"
            hint="Office, video link, or address. Optional."
          >
            <Input
              id="schedule-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Zoom link, room number, etc."
            />
          </Field>

          <Field
            label="Notes"
            htmlFor="schedule-notes"
            hint="Anything you'd like visible on the event. Optional."
          >
            <Textarea
              id="schedule-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reminders to yourself — visible on the calendar event."
            />
          </Field>

          {error ? (
            <p className="text-rose tracking-body text-[13px] font-medium" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <PillButton variant="ghost" size="sm" type="button" onClick={downloadIcs}>
              <Download size={14} strokeWidth={1.75} /> Download .ics
            </PillButton>
            <PillButton variant="primary" size="md" type="submit">
              <CalendarPlus size={14} strokeWidth={1.75} /> Open in Google Calendar
            </PillButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────

function defaultSlot(): { date: string; time: string } {
  const now = new Date();
  // Next workday at 10:00 local, rolled forward past weekends.
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0, 0, 0);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return { date: localDate(d), time: "10:00" };
}

function localDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Google Calendar's "render" endpoint uses floating local time when the
// timestamps lack a Z suffix — that matches what therapists mean by "1pm".
function gcalLocalStamp(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}${m}${day}T${hh}${mm}00`;
}

function utcStamp(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${day}T${hh}${mm}${ss}Z`;
}

type EventInput = {
  title: string;
  start: Date;
  end: Date;
  details: string;
  location: string;
};

function buildGoogleCalendarUrl(ev: EventInput): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${gcalLocalStamp(ev.start)}/${gcalLocalStamp(ev.end)}`,
  });
  if (ev.details) params.set("details", ev.details);
  if (ev.location) params.set("location", ev.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// RFC 5545 escaping for SUMMARY/DESCRIPTION/LOCATION text values.
function icsEscape(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function buildIcs(ev: EventInput): string {
  const uid = `${utcStamp(new Date())}-${Math.random().toString(36).slice(2, 10)}@attuna`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Attuna//Session Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${gcalLocalStamp(ev.start)}`,
    `DTEND:${gcalLocalStamp(ev.end)}`,
    `SUMMARY:${icsEscape(ev.title)}`,
  ];
  if (ev.details) lines.push(`DESCRIPTION:${icsEscape(ev.details)}`);
  if (ev.location) lines.push(`LOCATION:${icsEscape(ev.location)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "session"
  );
}

export default ScheduleSessionModal;
