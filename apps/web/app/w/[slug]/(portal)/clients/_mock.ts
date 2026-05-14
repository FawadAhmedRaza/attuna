// Phase 2: hardcoded mock data so the client detail page is navigable end-to-end.
// Phase 4 replaces all of this with /api/clients/:id + /api/clients/:id/briefs etc.

import {
  AlertCircle,
  BookOpen,
  Brain,
  Compass,
  Heart,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type ClientStatus = "ready" | "data" | "wait";

export type Confidence = "high" | "moderate" | "low";

export type ClientEntry = {
  id?: string;
  date: string;
  time?: string;
  emotion: string;
  intensity?: number;
  wordCount?: number;
  flagged?: boolean;
  flagReason?: string;
  text: string;
};

export type ClientNote = {
  date: string;
  text: string;
};

export type InsightArea = {
  icon: LucideIcon;
  label: string;
  width: string;
  note: string;
  confidence: Confidence;
  body: string;
};

export type InsightItem = {
  label: string;
  frequency?: string;
  confidence: Confidence;
  quotes?: string[];
};

export type InsightDetailArea = {
  id: string;
  label: string;
  icon: LucideIcon;
  summary: string;
  items: InsightItem[];
};

export type CrossSessionTheme = {
  theme: string;
  first: string;
  briefs: number;
  status: "Recurring" | "Increasing" | "Resolved" | "New";
};

export type PastBrief = {
  id: string;
  date: string;
  preparedAt: string;
  excerpt: string;
  entriesCovered: number;
};

export type ClientSuggestion = {
  id: string;
  title: string;
  body: string;
  theme: string;
  status: "sent" | "scheduled";
  acknowledged?: boolean;
  scheduledFor?: string;
  sentAt?: string;
};

export type RadarPoint = { dimension: string; current: number; baseline: number };

export type ClientMock = {
  id: string;
  name: string;
  initial: string;
  status: ClientStatus;
  emotion: string;
  trend: string;
  entries: number;
  days: number;
  lastSession: string;
  briefPreparedAt: string | null;
  briefBody: string | null;
  insights: InsightArea[];
  suggestedTopics: string[];
  recentEntries: ClientEntry[];
  notes: ClientNote[];
  trends: {
    avgIntensity: string;
    intensityDelta: string;
    vocabulary: string;
    vocabularyTrend: string;
    engagement: string;
    engagementTrend: string;
  };
};

// Shared fixtures across the prototype client detail tabs. In Phase 4, each of
// these comes from a per-client API endpoint. For now they're static so all
// new tabs render with content even when a particular client lacks an override.

export const INSIGHT_DETAIL_AREAS: InsightDetailArea[] = [
  {
    id: "emotional",
    label: "Emotional experience",
    icon: Heart,
    summary:
      "Frustration directed at her partner gives way to a flatter, more resigned register around April 26. The word \u201cempty\u201d appears for the first time in twelve weeks of journaling.",
    items: [
      {
        label: "Frustration with partner",
        frequency: "8 of 14 entries",
        confidence: "high",
        quotes: [
          "Why does this keep happening? I keep thinking it'll be different.",
          "I'm so tired of fighting about the same things.",
        ],
      },
      {
        label: "Resignation / emptiness",
        frequency: "First seen Apr 26 \u00b7 4 entries since",
        confidence: "moderate",
        quotes: [
          "Just empty today. Couldn't get out of bed until 2.",
          "I don't even know what I'm sad about anymore.",
        ],
      },
      {
        label: "Anxious somatic load",
        frequency: "6 of 14 entries reference physical symptoms",
        confidence: "moderate",
        quotes: ["My chest felt tight for hours."],
      },
    ],
  },
  {
    id: "cognitive",
    label: "Cognitive patterns",
    icon: Brain,
    summary:
      "Repeated returns to the same thought structures. Catastrophic framing has decreased compared to last period, but rumination loops remain intact.",
    items: [
      {
        label: "Rumination",
        frequency: "Recurring across most entries",
        confidence: "high",
        quotes: ['"why does this keep happening"', '"nothing will change"'],
      },
      {
        label: "Reduced catastrophizing",
        frequency: "Trend: down vs last period",
        confidence: "moderate",
      },
    ],
  },
  {
    id: "behavioral",
    label: "Behavioral triggers",
    icon: Target,
    summary:
      "Three of the most intense entries occurred on Sunday evenings, correlating with anticipated time alone and unstructured days.",
    items: [
      {
        label: "Sunday evening pattern",
        frequency: "3 high-intensity entries",
        confidence: "moderate",
        quotes: ["Couldn't sleep. Kept replaying the argument."],
      },
      {
        label: "Weekday baseline",
        frequency: "Avg intensity \u22121.4 vs weekends",
        confidence: "moderate",
      },
    ],
  },
  {
    id: "avoidance",
    label: "Avoidance & engagement",
    icon: AlertCircle,
    summary:
      "Engagement remains within range. A small mid-week dip in entry length is worth noting without alarm.",
    items: [
      {
        label: "Mid-week brevity",
        frequency: "Tue\u2013Thu entries under 60 words",
        confidence: "low",
      },
    ],
  },
  {
    id: "narrative",
    label: "Narrative & identity",
    icon: BookOpen,
    summary:
      "Self-references shift from active (\u201cI keep doing\u2026\u201d) to passive (\u201cthings happen to me\u201d) in the second half of the period.",
    items: [
      {
        label: "Agency language",
        frequency: "Decreasing in last 5 entries",
        confidence: "moderate",
      },
    ],
  },
  {
    id: "progress",
    label: "Progress over time",
    icon: TrendingUp,
    summary:
      "Vocabulary range is up 12% vs last period; intensity peaks are less extreme. The shift around Apr 26 is the main exception.",
    items: [
      {
        label: "Vocabulary range",
        frequency: "+12% vs last period",
        confidence: "high",
      },
      {
        label: "Intensity ceiling",
        frequency: "Peaks 8/10 \u2192 7/10",
        confidence: "moderate",
      },
    ],
  },
  {
    id: "guidance",
    label: "Therapist guidance",
    icon: Compass,
    summary: "Editorial layer \u2014 your authored suggestions appear here. Not AI-generated.",
    items: [],
  },
];

export const CROSS_SESSION_THEMES: CrossSessionTheme[] = [
  { theme: "Frustration with partner", first: "Mar 12", briefs: 6, status: "Recurring" },
  { theme: "Sleep disruption after conflict", first: "Apr 02", briefs: 4, status: "Increasing" },
  { theme: "Work-life balance", first: "Mar 28", briefs: 3, status: "Resolved" },
  { theme: "Empty / numb language", first: "Apr 27", briefs: 1, status: "New" },
];

export const PAST_BRIEFS: PastBrief[] = [
  {
    id: "b_0042",
    date: "Apr 25",
    preparedAt: "9:14 PM",
    excerpt:
      "Frustration patterns concentrated on weekends. Vocabulary remains rich; intensity peaks at 8/10 mid-week.",
    entriesCovered: 11,
  },
  {
    id: "b_0035",
    date: "Apr 11",
    preparedAt: "8:30 PM",
    excerpt:
      "Recurring rumination loops; catastrophizing has softened. Sleep references appear in five of nine entries.",
    entriesCovered: 9,
  },
  {
    id: "b_0028",
    date: "Mar 28",
    preparedAt: "10:02 PM",
    excerpt:
      "Initial intake patterns: chronic dissatisfaction, weekend dread, marriage tension underneath much of the affect.",
    entriesCovered: 8,
  },
];

export const RADAR_PROFILE: RadarPoint[] = [
  { dimension: "Emotional", current: 8.2, baseline: 6.5 },
  { dimension: "Cognitive", current: 6.4, baseline: 5.8 },
  { dimension: "Behavioral", current: 7.1, baseline: 6.0 },
  { dimension: "Avoidance", current: 4.0, baseline: 5.3 },
  { dimension: "Narrative", current: 5.5, baseline: 6.7 },
  { dimension: "Progress", current: 6.8, baseline: 5.0 },
];

export const LONGITUDINAL: { week: string; intensity: number }[] = [
  { week: "W1", intensity: 5.2 },
  { week: "W2", intensity: 5.6 },
  { week: "W3", intensity: 6.0 },
  { week: "W4", intensity: 6.4 },
  { week: "W5", intensity: 6.1 },
  { week: "W6", intensity: 5.8 },
  { week: "W7", intensity: 5.5 },
  { week: "W8", intensity: 6.0 },
  { week: "W9", intensity: 6.6 },
  { week: "W10", intensity: 7.0 },
  { week: "W11", intensity: 6.8 },
  { week: "W12", intensity: 6.2 },
];

export const CLIENT_SUGGESTIONS: Record<string, ClientSuggestion[]> = {
  maya: [
    {
      id: "s_0012",
      title: "Notice the Sunday weight",
      body: "When Sundays get heavy, what would happen if you let one tiny ritual mark the start of the week — even something five minutes long?",
      theme: "behavioral",
      status: "sent",
      acknowledged: true,
      sentAt: "Apr 28",
    },
    {
      id: "s_0011",
      title: "Empty as data, not failure",
      body: "The word \u201cempty\u201d arrived recently in your writing. It's a signal, not a verdict. What does it want you to know?",
      theme: "emotional",
      status: "sent",
      acknowledged: false,
      sentAt: "Apr 27",
    },
    {
      id: "s_0010",
      title: "A weekday wind-down",
      body: "Try ending Tuesdays with a short reflection on what landed well. Less than three sentences is plenty.",
      theme: "reflection",
      status: "scheduled",
      scheduledFor: "May 8",
    },
  ],
};

export const ENTRY_DEFAULTS: Required<Pick<ClientEntry, "id" | "wordCount" | "intensity">> = {
  id: "e_0000",
  wordCount: 0,
  intensity: 0,
};

const MAYA_INSIGHTS: InsightArea[] = [
  {
    icon: Heart,
    label: "Emotional Experience",
    width: "85%",
    note: "Significant shift detected on April 26",
    confidence: "high",
    body: "Maya's entries this period are dominated by frustration directed at her partner and a recurring sense of being stuck. Around April 26, the tone shifted — from active frustration to a flatter, more resigned register. The word \u201cempty\u201d appeared for the first time in twelve weeks of journaling.",
  },
  {
    icon: Brain,
    label: "Cognitive Patterns",
    width: "62%",
    note: "Rumination patterns persistent",
    confidence: "moderate",
    body: 'Repeated returns to the same thought structures: "why does this keep happening," "nothing will change." Catastrophic framing has decreased compared to last period, but the underlying thought loops remain intact.',
  },
  {
    icon: Target,
    label: "Behavioral Triggers",
    width: "78%",
    note: "Weekend pattern emerging",
    confidence: "moderate",
    body: "Three of the most intense entries occurred on Sunday evenings. The pattern correlates with anticipated time alone and unstructured days. Weekday entries trend lower in intensity by an average of 1.4 points.",
  },
];

const DEVON_INSIGHTS: InsightArea[] = [
  {
    icon: Heart,
    label: "Emotional Experience",
    width: "72%",
    note: "Reflective tone, lower volatility",
    confidence: "high",
    body: "Devon's entries this period read as steady and reflective. Earlier urgency around career direction has softened into more measured framing. Self-criticism still surfaces but is briefer and met with self-correction more often than in past periods.",
  },
  {
    icon: Brain,
    label: "Cognitive Patterns",
    width: "55%",
    note: "Constructive reframing more common",
    confidence: "moderate",
    body: "Reframing language (\u201con the other hand,\u201d \u201cmaybe it's also that\u201d) appears in seven of twenty-two entries — up from two last period. Black-and-white framing of work decisions is decreasing.",
  },
  {
    icon: AlertCircle,
    label: "Avoidance",
    width: "38%",
    note: "Mild engagement dip mid-week",
    confidence: "low",
    body: "Three short entries clustered Tuesday\u2013Thursday with under fifty words each. Could be schedule-driven or a slight withdrawal — worth checking in on without alarm.",
  },
];

const JAMES_INSIGHTS: InsightArea[] = [
  {
    icon: Heart,
    label: "Emotional Experience",
    width: "68%",
    note: "Anxiety steady, with one elevated entry",
    confidence: "moderate",
    body: "James's entries are predominantly anxious with one notable spike on April 22. The language is bodily — chest tightness, racing thoughts — rather than narrative. Sleep references appear in five of eight entries.",
  },
  {
    icon: Target,
    label: "Behavioral Triggers",
    width: "60%",
    note: "Work-evening pattern",
    confidence: "moderate",
    body: "Most intense entries cluster between 9pm and midnight, often referencing the next day's calendar. Mornings, when he writes, read calmer.",
  },
];

export const CLIENTS: Record<string, ClientMock> = {
  maya: {
    id: "maya",
    name: "Maya R.",
    initial: "M",
    status: "ready",
    emotion: "frustrated",
    trend: "shifting",
    entries: 14,
    days: 19,
    lastSession: "8 days ago",
    briefPreparedAt: "10:30 PM",
    briefBody:
      "Maya's entries this period are dominated by frustration directed at her partner and a recurring sense of being stuck. Around April 26, the tone shifted — from active frustration to a flatter, more resigned register. The word \u201cempty\u201d appeared for the first time in twelve weeks of journaling.",
    insights: MAYA_INSIGHTS,
    suggestedTopics: [
      "The shift around April 26 — what changed in her week?",
      'First appearance of "empty" in twelve weeks. Worth gently exploring.',
      "Sunday evening pattern — possible behavioral target.",
    ],
    recentEntries: [
      {
        id: "e_0094",
        date: "Apr 28",
        time: "11:42 PM",
        emotion: "anxious",
        intensity: 6,
        wordCount: 64,
        text: "Couldn't sleep. Kept replaying the argument. My chest felt tight for hours. I keep thinking about what he said, the way he said it. I don't know how to respond anymore.",
      },
      {
        id: "e_0093",
        date: "Apr 27",
        time: "9:15 AM",
        emotion: "empty",
        intensity: 7,
        wordCount: 28,
        flagged: true,
        flagReason:
          "First appearance of \u201cempty\u201d in twelve weeks. Worth gently exploring.",
        text: "Just empty today. Couldn't get out of bed until 2. I don't even know what I'm sad about anymore.",
      },
      {
        id: "e_0092",
        date: "Apr 26",
        time: "8:30 PM",
        emotion: "frustrated",
        intensity: 8,
        wordCount: 51,
        flagged: true,
        flagReason: "Marks the tone shift identified in this period's brief.",
        text: "Another one of those days. Why does this keep happening? I keep thinking it'll be different and it never is. I'm so tired of fighting about the same things.",
      },
    ],
    notes: [
      {
        date: "Apr 24",
        text: "Discussed weekend coping strategies. Maya was open about avoidance. Plan: schedule one anchor activity Sunday afternoons.",
      },
      {
        date: "Apr 17",
        text: "Marriage tension underneath much of the affect. Worth circling back next session.",
      },
      {
        date: "Apr 10",
        text: "Initial intake. Presenting concerns: chronic dissatisfaction, sleep issues, weekend dread.",
      },
    ],
    trends: {
      avgIntensity: "6.4",
      intensityDelta: "−0.8 vs last period",
      vocabulary: "+12%",
      vocabularyTrend: "richer",
      engagement: "73%",
      engagementTrend: "stable",
    },
  },
  devon: {
    id: "devon",
    name: "Devon N.",
    initial: "D",
    status: "ready",
    emotion: "reflective",
    trend: "improving",
    entries: 22,
    days: 28,
    lastSession: "11 days ago",
    briefPreparedAt: "9:14 PM",
    briefBody:
      "Devon's entries continue a steady, reflective register established last period. The intensity of career-related rumination has eased; entries feel more observational than reactive. Two short Tuesday\u2013Thursday entries are worth a gentle check-in.",
    insights: DEVON_INSIGHTS,
    suggestedTopics: [
      "How are weekends feeling now that the work calendar is steadier?",
      "The mid-week short entries — schedule, or something else?",
      "Reframing language is increasing. Worth naming what's helping.",
    ],
    recentEntries: [
      {
        date: "May 04, 8:10 AM",
        emotion: "reflective · 5/10",
        text: "Coffee, slow morning. Thinking about whether to take the role. The catastrophizing has quieted; I'm just weighing it now.",
      },
      {
        date: "May 02, 10:55 PM",
        emotion: "tired · 4/10",
        text: "Long day, but a good one. Surprised myself by leaving on time. Maybe that's what counts as progress.",
      },
      {
        date: "Apr 30, 7:42 AM",
        emotion: "reflective · 5/10",
        text: "I keep noticing how much smaller the worry feels when I write it out. Strange that the writing is the thing.",
      },
    ],
    notes: [
      {
        date: "Apr 22",
        text: "Devon raised the new role offer. Took space rather than catastrophizing — a real shift.",
      },
      {
        date: "Apr 08",
        text: "First session. Goal: reduce work rumination. Strong reflective capacity already present.",
      },
    ],
    trends: {
      avgIntensity: "4.8",
      intensityDelta: "−1.2 vs last period",
      vocabulary: "+6%",
      vocabularyTrend: "stable",
      engagement: "88%",
      engagementTrend: "consistent",
    },
  },
  james: {
    id: "james",
    name: "James K.",
    initial: "J",
    status: "data",
    emotion: "anxious",
    trend: "steady",
    entries: 8,
    days: 12,
    lastSession: "5 days ago",
    briefPreparedAt: "11:02 PM",
    briefBody:
      "James's entries are predominantly anxious, with one notable spike on April 22. Bodily language (chest tightness, racing thoughts) features more than narrative. Sleep is referenced in five of eight entries.",
    insights: JAMES_INSIGHTS,
    suggestedTopics: [
      "The Apr 22 spike — what was happening that day?",
      "Sleep is recurring. Open a small thread on routines.",
      "Body-first descriptions — possible somatic anchor work.",
    ],
    recentEntries: [
      {
        date: "Apr 25, 11:20 PM",
        emotion: "anxious · 6/10",
        text: "Same again. Lying awake, head running through tomorrow. Keep telling myself it'll be fine. It mostly is. Doesn't help in the moment.",
      },
      {
        date: "Apr 22, 10:48 PM",
        emotion: "anxious · 8/10",
        text: "Heart pounding for an hour after the email. I know rationally it's not a big deal. Try telling that to my chest.",
      },
      {
        date: "Apr 20, 8:00 AM",
        emotion: "calm · 3/10",
        text: "Slept well. Notable. Coffee, walk, didn't check work first thing. Felt like a different person.",
      },
    ],
    notes: [
      {
        date: "Apr 19",
        text: "James asking about somatic tools. Plan: introduce one body-based regulation practice this week.",
      },
    ],
    trends: {
      avgIntensity: "5.7",
      intensityDelta: "+0.3 vs last period",
      vocabulary: "−2%",
      vocabularyTrend: "narrowing",
      engagement: "65%",
      engagementTrend: "uneven",
    },
  },
  aisha: {
    id: "aisha",
    name: "Aisha P.",
    initial: "A",
    status: "wait",
    emotion: "—",
    trend: "—",
    entries: 3,
    days: 5,
    lastSession: "2 days ago",
    briefPreparedAt: null,
    briefBody: null,
    insights: [],
    suggestedTopics: [],
    recentEntries: [
      {
        date: "May 03, 7:14 PM",
        emotion: "—",
        text: "Trying this. Not sure what to write. I'll start small.",
      },
      {
        date: "May 02, 6:50 PM",
        emotion: "—",
        text: "Wrote and deleted a few times. Maybe tomorrow.",
      },
      {
        date: "May 01, 9:22 PM",
        emotion: "—",
        text: "First entry. Feeling cautious about all of this.",
      },
    ],
    notes: [
      {
        date: "May 01",
        text: "Initial intake. Aisha is cautious about the journaling — gave low-pressure framing.",
      },
    ],
    trends: {
      avgIntensity: "—",
      intensityDelta: "—",
      vocabulary: "—",
      vocabularyTrend: "too few entries",
      engagement: "—",
      engagementTrend: "—",
    },
  },
};

export function getClientById(id: string): ClientMock | null {
  return CLIENTS[id] ?? null;
}

export function getAllClients(): ClientMock[] {
  return Object.values(CLIENTS);
}
