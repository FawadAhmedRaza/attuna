// Synthetic upcoming-sessions data. Phase 4 replaces this with a real source
// (Google Calendar read or our own bookings table). Dates are computed relative
// to "now" so the calendar always shows recent + upcoming events, regardless
// of when the page is opened.

export type Session = {
  id: string;
  clientId: string;
  clientName: string;
  initial: string;
  date: string; // YYYY-MM-DD (local)
  time: string; // HH:MM (24h, local)
  duration: number; // minutes
  location?: string;
  briefReady: boolean;
};

type Slot = {
  clientId: string;
  clientName: string;
  initial: string;
  dow: number; // 0 = Sunday … 6 = Saturday
  time: string;
  duration: number;
  location?: string;
  briefReady: boolean;
};

const RECURRING: Slot[] = [
  {
    clientId: "aisha",
    clientName: "Aisha P.",
    initial: "A",
    dow: 1, // Mon
    time: "16:00",
    duration: 50,
    location: "Zoom",
    briefReady: false,
  },
  {
    clientId: "maya",
    clientName: "Maya R.",
    initial: "M",
    dow: 2, // Tue
    time: "09:00",
    duration: 50,
    location: "Office",
    briefReady: true,
  },
  {
    clientId: "devon",
    clientName: "Devon N.",
    initial: "D",
    dow: 2, // Tue
    time: "14:00",
    duration: 50,
    location: "Office",
    briefReady: true,
  },
  {
    clientId: "james",
    clientName: "James K.",
    initial: "J",
    dow: 4, // Thu
    time: "11:00",
    duration: 50,
    location: "Zoom",
    briefReady: false,
  },
  {
    clientId: "maya",
    clientName: "Maya R.",
    initial: "M",
    dow: 5, // Fri (every other week)
    time: "10:00",
    duration: 45,
    location: "Office",
    briefReady: true,
  },
];

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Returns sessions spanning a window around `now`: from 7 days back through
// 28 days forward. That gives a realistic month view even when the user lands
// on the calendar near a month boundary.
export function getUpcomingSessions(now: Date = new Date()): Session[] {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 28);
  const sessions: Session[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    const dateKey = localDateKey(d);
    for (const slot of RECURRING) {
      if (slot.dow !== dow) continue;
      // Friday Maya is every other week — keep it sparse.
      if (slot.dow === 5 && getIsoWeek(d) % 2 === 0) continue;
      sessions.push({
        id: `${dateKey}-${slot.clientId}-${slot.time}`,
        clientId: slot.clientId,
        clientName: slot.clientName,
        initial: slot.initial,
        date: dateKey,
        time: slot.time,
        duration: slot.duration,
        location: slot.location,
        briefReady: slot.briefReady,
      });
    }
  }
  return sessions;
}

function getIsoWeek(d: Date): number {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() + 4 - (t.getDay() || 7));
  const yearStart = new Date(t.getFullYear(), 0, 1);
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
