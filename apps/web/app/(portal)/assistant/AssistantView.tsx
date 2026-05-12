"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookmarkPlus,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Lock,
  MessageSquareText,
  Mic,
  MicOff,
  Paperclip,
  Pencil,
  Search,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { Field } from "@attuna/ui/Field";
import { Input } from "@attuna/ui/Input";
import { PillButton } from "@attuna/ui/PillButton";
import { Textarea } from "@attuna/ui/Textarea";

import { CLIENTS } from "../clients/_mock";

// ─── Voice input (Web Speech API) ────────────────────────────────────
// PHI WARNING: browser-native SpeechRecognition typically routes audio to a
// cloud STT service (Chrome → Google) that is NOT covered by our BAA. Before
// real client-identifiable speech is spoken into this field in production,
// gate this feature on browsers that transcribe on-device, or replace with a
// BAA-covered transcription service (e.g. AWS Transcribe Medical). See
// HIPAA.md (TBD).

type SpeechRecognitionResultLike = ArrayLike<{ transcript: string }>;
type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
  resultIndex: number;
};

type SpeechRecognitionInstance = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Frontend mock — no real LLM call. When the Bedrock pipeline is wired
// (per ARCHITECTURE.md), `mockReply` is replaced with a server action that
// streams from a BAA-covered Anthropic Claude model. Until then we keep the
// shape of the conversation right so the swap is mechanical.

type Role = "user" | "assistant";

type Attachment = {
  id: string;
  name: string;
  size: number;
  type: string;
};

type Message = {
  id: string;
  role: Role;
  content: string;
  ts: number;
  attachments?: Attachment[];
};

// Persistence shape for things the therapist saves out of the assistant. Real
// backend writes these to per-client tables; the localStorage path here keeps
// behaviour identical so the swap is just changing the load/save functions.

type SaveKind = "suggestion" | "template";

type SavedItem = {
  id: string;
  kind: SaveKind;
  title: string;
  body: string;
  // null = practice-wide (templates often are; suggestions can be too if not
  // scoped). Otherwise this references a client id.
  clientId: string | null;
  // Optional theme tag for suggestions.
  theme?: string;
  createdAt: number;
};

const SAVED_SUGGESTIONS_KEY = "attuna_assistant_saved_suggestions_v1";
const SAVED_TEMPLATES_KEY = "attuna_assistant_saved_templates_v1";

function loadSaved(kind: SaveKind): SavedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const key = kind === "suggestion" ? SAVED_SUGGESTIONS_KEY : SAVED_TEMPLATES_KEY;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveItem(item: SavedItem): void {
  if (typeof window === "undefined") return;
  try {
    const key = item.kind === "suggestion" ? SAVED_SUGGESTIONS_KEY : SAVED_TEMPLATES_KEY;
    const current = loadSaved(item.kind);
    localStorage.setItem(key, JSON.stringify([item, ...current]));
  } catch {
    // Quota or private mode — silent. Persistence is best-effort.
  }
}

type ClientOption = { id: string; name: string };

// The picker pulls from the same mock that powers /clients and PortalSidebar
// so the four names line up across the app. Order = [All, ...clients].
const CLIENT_OPTIONS: ReadonlyArray<ClientOption> = Object.values(CLIENTS).map((c) => ({
  id: c.id,
  name: c.name,
}));

const PRACTICE_PROMPTS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "this-week", label: "What patterns are emerging across my clients this week?" },
  { id: "tomorrow", label: "Help me prepare for tomorrow's sessions." },
  { id: "grief-prompt", label: "Suggest a calm follow-up prompt for someone in grief." },
  { id: "first-five", label: "Which of my clients is closest to their first brief?" },
];

function clientPrompts(name: string): ReadonlyArray<{ id: string; label: string }> {
  const first = name.split(" ")[0] ?? name;
  return [
    { id: "changing", label: `What's been changing for ${first} recently?` },
    { id: "session", label: `Help me prepare for tomorrow's session with ${first}.` },
    { id: "phrase", label: `Suggest a calm follow-up prompt for ${first}.` },
    { id: "missed", label: `What might I be missing in ${first}'s entries?` },
  ];
}

const FALLBACK_REPLY =
  "I'm here to help you think out loud. I'll keep observations calibrated — what's strong, what's tentative, what's missing — and won't diagnose. " +
  "Try asking about a specific client, a pattern across your practice, or how to phrase a suggestion.";

// Lightweight keyword matcher for practice-wide questions. Order matters —
// first match wins. When a client is selected, `clientReply` runs first.
const REPLIES: ReadonlyArray<{ keys: ReadonlyArray<string>; reply: string }> = [
  {
    keys: ["this week", "patterns", "across", "practice"],
    reply:
      "Across your four active clients, three threads recur this week: relationship friction (Maya), anxious somatic load (James), and post-event reflection (Devon). " +
      "Aisha is still in the early window. None of this is a substitute for what you'll notice when you sit with each person — it's just where to listen first.",
  },
  {
    keys: ["grief", "loss", "bereavement"],
    reply:
      "If you want to send a quiet prompt, something open works better than something directive. For example: " +
      "\u201COn low-energy days, can you choose one anchor — something small — that marks the start of the day? Opening curtains, making tea, sitting near a window for two minutes. Not every day. Just when nothing else feels possible.\u201D " +
      "Adjust the phrasing to your voice. Clients tend to feel the difference.",
  },
  {
    keys: ["session", "prepare", "tomorrow"],
    reply:
      "A few things worth sitting with before tomorrow: which client's last entry surprised you most, what you've been carrying from the previous session, and one question you'd ask if there were no time pressure. " +
      "I can pull recent entries for any client — just say their name or pick them from the chips above.",
  },
  {
    keys: ["suggest", "prompt", "follow-up", "phrase"],
    reply:
      "Calm prompts tend to share three properties: they're open (not yes/no), short (one or two sentences), and they don't ask the client to perform progress. " +
      "If you tell me the theme — sleep, weekends, a specific feeling — I can draft something in your voice for you to edit.",
  },
  {
    keys: ["first brief", "brief ready", "five entries"],
    reply:
      "Briefs become available around five entries, usually within a week of consistent journaling. Right now Aisha (3 entries over 5 days) is closest to that threshold. James and Maya have ready briefs you haven't opened yet.",
  },
];

// Per-client replies. These are the brief excerpts in conversational form —
// they read the same way the assistant would summarise a client at the top
// of a session.
const CLIENT_REPLIES: Record<string, string> = {
  maya:
    "Across the last twelve weeks, two threads stand out for Maya: frustration directed at her partner, and a recurring sense of being stuck. The April 26 shift — from active frustration to a more resigned register — was the most notable inflection in twelve weeks of journaling. The word \u201cempty\u201d appeared for the first time around that point. " +
    "Worth sitting with, gently. Your read of the room will catch what the data can't.",
  devon:
    "Devon's entries this period read as steadier and more reflective than the previous one. Career-related rumination has softened; entries feel more observational than reactive. " +
    "Self-criticism still surfaces but is briefer and self-corrected more often. Two short Tuesday\u2013Thursday entries are worth a gentle check-in.",
  james:
    "James's recent entries are predominantly anxious, with one notable spike on April 22. The language is bodily — chest tightness, racing thoughts — rather than narrative. Sleep is referenced in five of eight entries. " +
    "Bodily-first phrasing tends to respond well to grounding prompts; you'd know better than I would whether that fits where you're working.",
  aisha:
    "Aisha is in the early window. Three entries over five days isn't enough to surface patterns reliably — anything I tell you now would mislead more than help. " +
    "Around entry five or six, the picture usually starts to come into focus.",
};

function clientReply(clientId: string, prompt: string): string {
  const lower = prompt.toLowerCase();
  const summary = CLIENT_REPLIES[clientId];
  if (lower.includes("phrase") || lower.includes("prompt") || lower.includes("suggest")) {
    return REPLIES.find((r) => r.keys.includes("suggest"))?.reply ?? FALLBACK_REPLY;
  }
  if (lower.includes("session") || lower.includes("prepare") || lower.includes("tomorrow")) {
    return REPLIES.find((r) => r.keys.includes("session"))?.reply ?? FALLBACK_REPLY;
  }
  return summary ?? FALLBACK_REPLY;
}

function mockReply(clientId: string | null, prompt: string, attachments: Attachment[]): string {
  const base = (() => {
    if (clientId) return clientReply(clientId, prompt);
    const lower = prompt.toLowerCase();
    for (const opt of CLIENT_OPTIONS) {
      const first = (opt.name.split(" ")[0] ?? "").toLowerCase();
      if (first && lower.includes(first)) return clientReply(opt.id, prompt);
    }
    for (const entry of REPLIES) {
      if (entry.keys.some((k) => lower.includes(k))) return entry.reply;
    }
    return FALLBACK_REPLY;
  })();

  if (attachments.length === 0) return base;
  const names = attachments.map((a) => a.name).join(", ");
  // Acknowledge attachments without pretending to have read them — real
  // pipeline will OCR/extract text inside Bedrock with PHI scrubbing first.
  return (
    `I noted the file${attachments.length > 1 ? "s" : ""} you attached (${names}). ` +
    `I'll keep them in context. ${base}`
  );
}

function uid(): string {
  return `m_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

// Streaming reveal speed for assistant replies. Real Bedrock streams tokens
// at variable speed; the constants here approximate a comfortable read pace
// (~165 chars/sec) without feeling robotic.
const STREAM_CHARS_PER_TICK = 3;
const STREAM_TICK_MS = 18;

export function AssistantView({ clientId }: { clientId: string | null }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [scopePickerOpen, setScopePickerOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saveTarget, setSaveTarget] = useState<{ kind: SaveKind; content: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Streaming reveal of the most recent assistant message.
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [streamedContent, setStreamedContent] = useState("");
  const streamingIntervalRef = useRef<number | null>(null);
  // Inline-edit state for user messages.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  // Per-message "Copied" flash on the assistant copy button.
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  const activeClient = clientId ? (CLIENT_OPTIONS.find((c) => c.id === clientId) ?? null) : null;
  const prompts = useMemo(
    () => (activeClient ? clientPrompts(activeClient.name) : PRACTICE_PROMPTS),
    [activeClient],
  );

  // Switching scope clears the thread — mixing client-scoped and practice-wide
  // turns in one conversation is more confusing than helpful, and matches how
  // a real Bedrock pipeline would have to re-prime the system prompt anyway.
  useEffect(() => {
    setMessages([]);
    setPending(false);
    setInput("");
    setAttachments([]);
    setEditingId(null);
    setStreamingId(null);
    setStreamedContent("");
    if (streamingIntervalRef.current !== null) {
      window.clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
  }, [clientId]);

  // Component cleanup — leave no orphan intervals.
  useEffect(() => {
    return () => {
      if (streamingIntervalRef.current !== null) {
        window.clearInterval(streamingIntervalRef.current);
        streamingIntervalRef.current = null;
      }
    };
  }, []);

  // Auto-scroll the thread to the bottom as new messages arrive.
  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, pending]);

  // Toast auto-dismiss.
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  function selectScope(nextId: string | null) {
    setScopePickerOpen(false);
    if (nextId === clientId) return;
    const url = nextId ? `/assistant?client=${encodeURIComponent(nextId)}` : "/assistant";
    router.push(url);
  }

  function addAttachments(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setAttachments((prev) => [
      ...prev,
      ...list.map((f) => ({
        id: uid(),
        name: f.name,
        size: f.size,
        type: f.type || "application/octet-stream",
      })),
    ]);
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function streamReply(messageId: string, fullContent: string) {
    if (streamingIntervalRef.current !== null) {
      window.clearInterval(streamingIntervalRef.current);
    }
    setStreamingId(messageId);
    setStreamedContent("");
    let i = 0;
    streamingIntervalRef.current = window.setInterval(() => {
      i = Math.min(i + STREAM_CHARS_PER_TICK, fullContent.length);
      setStreamedContent(fullContent.slice(0, i));
      if (i >= fullContent.length) {
        if (streamingIntervalRef.current !== null) {
          window.clearInterval(streamingIntervalRef.current);
          streamingIntervalRef.current = null;
        }
        setStreamingId(null);
        setStreamedContent("");
        // Pending stays true through streaming so the composer doesn't accept
        // a new turn mid-reveal — release it once the reply is fully shown.
        setPending(false);
      }
    }, STREAM_TICK_MS);
  }

  function generateAssistantReply(prompt: string, attached: Attachment[]) {
    const delay = 500 + Math.min(prompt.length * 6, 900);
    setPending(true);
    window.setTimeout(() => {
      const replyContent = mockReply(clientId, prompt, attached);
      const reply: Message = {
        id: uid(),
        role: "assistant",
        content: replyContent,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, reply]);
      streamReply(reply.id, replyContent);
    }, delay);
  }

  function send(text: string) {
    const trimmed = text.trim();
    // Allow sending if either text or attachments are present.
    if ((!trimmed && attachments.length === 0) || pending) return;
    const userMsg: Message = {
      id: uid(),
      role: "user",
      content: trimmed,
      ts: Date.now(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    const sentAttachments = attachments;
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachments([]);
    generateAssistantReply(trimmed, sentAttachments);
  }

  function startEdit(id: string, currentContent: string) {
    setEditingId(id);
    setEditValue(currentContent);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  // Saving an edit replaces the prompt and re-runs from there: the previous
  // assistant reply gets dropped, and a new one is generated against the new
  // prompt. Same shape as ChatGPT/Claude's "edit + resend" flow.
  function saveEdit() {
    if (editingId === null) return;
    const trimmed = editValue.trim();
    if (!trimmed) return;
    const id = editingId;

    // Mutate messages: keep up to the edited prompt, drop a trailing assistant
    // reply if it was attached to it.
    let promptAttachments: Attachment[] = [];
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      if (idx === -1) return prev;
      const editedMsg = prev[idx];
      if (!editedMsg) return prev;
      promptAttachments = editedMsg.attachments ?? [];
      const updated = { ...editedMsg, content: trimmed };
      const droppedReply = idx + 1 < prev.length && prev[idx + 1]?.role === "assistant" ? 1 : 0;
      return [...prev.slice(0, idx), updated, ...prev.slice(idx + 1 + droppedReply)];
    });

    setEditingId(null);
    setEditValue("");
    generateAssistantReply(trimmed, promptAttachments);
  }

  function deleteTurn(id: string) {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      if (idx === -1) return prev;
      // Delete the prompt and the paired assistant reply (if any) — orphan
      // replies read worse than nothing.
      const removeCount = idx + 1 < prev.length && prev[idx + 1]?.role === "assistant" ? 2 : 1;
      return [...prev.slice(0, idx), ...prev.slice(idx + removeCount)];
    });
    if (streamingId !== null) {
      // If we deleted the streaming message, stop the interval cleanly.
      if (streamingIntervalRef.current !== null) {
        window.clearInterval(streamingIntervalRef.current);
        streamingIntervalRef.current = null;
      }
      setStreamingId(null);
      setStreamedContent("");
      setPending(false);
    }
    if (editingId === id) cancelEdit();
  }

  async function copyMessage(id: string, content: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 1800);
    } catch {
      // Clipboard unavailable in non-secure contexts; the user can still
      // select the text manually.
    }
  }

  function pickPrompt(text: string) {
    setInput(text);
    inputRef.current?.focus();
  }

  function openSave(kind: SaveKind, content: string) {
    setSaveTarget({ kind, content });
  }

  function handleSaveSubmit(item: Omit<SavedItem, "id" | "createdAt">) {
    const full: SavedItem = { ...item, id: uid(), createdAt: Date.now() };
    saveItem(full);
    const where =
      item.clientId === null
        ? item.kind === "template"
          ? "your template library"
          : "practice-wide suggestions"
        : `${CLIENT_OPTIONS.find((c) => c.id === item.clientId)?.name ?? "that client"}`;
    setToast(`Saved as ${item.kind} for ${where}.`);
    setSaveTarget(null);
  }

  const scopeLabel = activeClient ? activeClient.name : "All clients";

  return (
    <div className="flex flex-1 flex-col">
      {/* Body — empty welcome stays vertically centered between header and
          composer; the thread fills the available space and scrolls within. */}
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-6">
          <Welcome activeClient={activeClient} />
        </div>
      ) : (
        <div
          ref={threadRef}
          className="min-h-[240px] flex-1 overflow-y-auto px-1"
          aria-live="polite"
        >
          <div className="flex flex-col gap-7">
            {messages.map((m) => {
              const streaming = streamingId === m.id;
              const displayContent = streaming ? streamedContent : m.content;
              return (
                <Bubble
                  key={m.id}
                  message={m}
                  content={displayContent}
                  streaming={streaming}
                  editing={editingId === m.id}
                  editValue={editValue}
                  onEditValueChange={setEditValue}
                  onStartEdit={() => startEdit(m.id, m.content)}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={saveEdit}
                  onDelete={() => deleteTurn(m.id)}
                  onCopy={() => copyMessage(m.id, m.content)}
                  copied={copiedId === m.id}
                  onSave={openSave}
                />
              );
            })}
            {/* Thinking indicator is only meaningful before the first chunk
                streams in — once any content is visible, the streaming cursor
                covers it. */}
            {pending && streamingId === null ? <ThinkingBubble /> : null}
          </div>
        </div>
      )}

      {/* Bottom dock — composer pinned to the bottom of the page. */}
      <div className="flex flex-col gap-3 pt-5">
        <Composer
          ref={inputRef}
          value={input}
          onChange={setInput}
          onSubmit={() => send(input)}
          pending={pending}
          scopeLabel={scopeLabel}
          scoped={activeClient !== null}
          onOpenScopePicker={() => setScopePickerOpen(true)}
          attachments={attachments}
          onAddAttachments={addAttachments}
          onRemoveAttachment={removeAttachment}
        />

        {messages.length === 0 ? <SuggestionsStrip prompts={prompts} onPick={pickPrompt} /> : null}

        <PrivacyFootnote scope={activeClient ? activeClient.name : null} />
      </div>

      <ScopePickerModal
        open={scopePickerOpen}
        activeId={clientId}
        onClose={() => setScopePickerOpen(false)}
        onSelect={selectScope}
      />

      {saveTarget ? (
        <SaveAsModal
          kind={saveTarget.kind}
          initialContent={saveTarget.content}
          defaultClientId={clientId}
          onClose={() => setSaveTarget(null)}
          onSave={handleSaveSubmit}
        />
      ) : null}

      {toast ? <Toast message={toast} /> : null}
    </div>
  );
}

function ScopePickerModal({
  open,
  activeId,
  onClose,
  onSelect,
}: {
  open: boolean;
  activeId: string | null;
  onClose: () => void;
  onSelect: (id: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset the search and refocus on every open so the modal is consistent
  // each time it appears.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [open]);

  // Close on Escape; lock body scroll while open.
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

  const trimmed = query.trim().toLowerCase();
  const matches = trimmed
    ? CLIENT_OPTIONS.filter((c) => c.name.toLowerCase().includes(trimmed))
    : CLIENT_OPTIONS;
  // "All clients" is shown at the top whenever the search is empty or matches
  // its label. Searching "all" or "everyone" surfaces it explicitly.
  const showAllOption = !trimmed || "all clients".includes(trimmed) || "everyone".includes(trimmed);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scope-modal-title"
      className="fade-in fixed inset-0 z-50 flex items-center justify-center px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "color-mix(in oklab, var(--ink) 35%, transparent)" }}
        aria-hidden="true"
      />
      <div className="bg-surface border-border relative w-full max-w-[440px] rounded-[20px] border p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-ink-mute hover:text-ink hover:bg-bg absolute right-3.5 top-3.5 rounded-full p-1.5 transition-colors"
        >
          <X size={16} strokeWidth={1.75} />
        </button>

        <h2
          id="scope-modal-title"
          className="display text-ink m-0 mb-1 text-[20px] font-medium"
          style={{ letterSpacing: "-0.015em" }}
        >
          Scope this conversation
        </h2>
        <p className="text-ink-soft mb-5 text-[13px]" style={{ lineHeight: 1.55 }}>
          The assistant will only reference data for whoever you select. Switching scope clears the
          thread.
        </p>

        <div className="relative mb-4">
          <Search
            size={14}
            strokeWidth={1.75}
            className="text-ink-mute pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients…"
            aria-label="Search clients"
            className="bg-bg-soft text-ink tracking-body w-full rounded-[12px] border border-[var(--border)] py-[11px] pl-10 pr-3 text-[13.5px] font-medium focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        <ul
          className="m-0 max-h-[320px] list-none overflow-y-auto p-0"
          role="listbox"
          aria-label="Client scope"
        >
          {showAllOption ? (
            <ScopeOption
              label="All clients"
              hint="Practice-wide answers across everyone."
              icon={<Users size={14} strokeWidth={1.75} />}
              active={activeId === null}
              onSelect={() => onSelect(null)}
            />
          ) : null}

          {matches.length === 0 && !showAllOption ? (
            <li className="text-ink-mute px-3 py-6 text-center text-[13px] italic">
              No clients match &ldquo;{query}&rdquo;.
            </li>
          ) : null}

          {matches.map((c) => (
            <ScopeOption
              key={c.id}
              label={c.name}
              icon={
                <span className="display bg-surface-deep text-ink-mute flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium">
                  {c.name.trim().charAt(0).toUpperCase()}
                </span>
              }
              active={activeId === c.id}
              onSelect={() => onSelect(c.id)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function ScopeOption({
  label,
  hint,
  icon,
  active,
  onSelect,
}: {
  label: string;
  hint?: string;
  icon: React.ReactNode;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        role="option"
        aria-selected={active}
        className={[
          "tracking-body flex w-full items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left transition-colors",
          active ? "bg-accent-bg border-accent" : "hover:bg-bg-soft border-transparent",
        ].join(" ")}
      >
        <span
          className={[
            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full",
            active ? "text-accent" : "text-ink-mute",
          ].join(" ")}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={[
              "block text-[13.5px] font-semibold",
              active ? "text-accent" : "text-ink",
            ].join(" ")}
            style={{ letterSpacing: "-0.005em" }}
          >
            {label}
          </span>
          {hint ? <span className="text-ink-mute mt-0.5 block text-[12px]">{hint}</span> : null}
        </span>
        {active ? (
          <Check size={14} strokeWidth={2.5} className="text-accent flex-shrink-0" />
        ) : null}
      </button>
    </li>
  );
}

function Welcome({ activeClient }: { activeClient: ClientOption | null }) {
  return (
    <div className="text-center">
      <div className="bg-accent-bg mx-auto mb-4 inline-flex h-10 w-10 items-center justify-center rounded-[12px]">
        <MessageSquareText size={18} strokeWidth={1.75} className="text-accent" />
      </div>
      <h2
        className="display text-ink m-0 mb-2 text-[24px] font-medium md:text-[28px]"
        style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
      >
        {activeClient ? `What about ${activeClient.name}?` : "What would help right now?"}
      </h2>
      <p className="text-ink-soft mx-auto max-w-[520px] text-[14px]" style={{ lineHeight: 1.6 }}>
        {activeClient
          ? `This conversation is scoped to ${activeClient.name}. The assistant will only reference their entries and briefs.`
          : "Ask about a specific client, a pattern across your practice, or how to phrase a suggestion. Observational, never diagnostic."}
      </p>
    </div>
  );
}

function SuggestionsStrip({
  prompts,
  onPick,
}: {
  prompts: ReadonlyArray<{ id: string; label: string }>;
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="px-1">
      <div
        className="text-ink-mute mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em]"
        aria-hidden="true"
      >
        <Sparkles size={12} strokeWidth={2} /> Try
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {prompts.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onPick(p.label)}
              className="bg-surface border-border text-ink-soft hover:text-ink hover:border-accent rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors"
            >
              {p.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

type BubbleProps = {
  message: Message;
  content: string;
  streaming: boolean;
  editing: boolean;
  editValue: string;
  onEditValueChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  copied: boolean;
  onSave: (kind: SaveKind, content: string) => void;
};

function Bubble({
  message,
  content,
  streaming,
  editing,
  editValue,
  onEditValueChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onCopy,
  copied,
  onSave,
}: BubbleProps) {
  const isUser = message.role === "user";

  // Edit mode swaps the content for an inline textarea + Save/Cancel — we
  // keep the same row layout so the message doesn't jump around vertically.
  if (isUser && editing) {
    return (
      <div className="group flex flex-col items-end gap-2" data-role="user">
        <textarea
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          rows={Math.min(6, Math.max(2, editValue.split("\n").length + 1))}
          className="bg-surface border-border focus:border-accent text-ink w-full max-w-[80%] resize-none rounded-[14px] border px-4 py-3 text-[14px] focus:outline-none"
          style={{ lineHeight: 1.6, letterSpacing: "-0.005em" }}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onSaveEdit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancelEdit();
            }
          }}
        />
        <div className="flex items-center gap-2">
          <PillButton variant="ghost" size="sm" onClick={onCancelEdit}>
            Cancel
          </PillButton>
          <PillButton
            variant="primary"
            size="sm"
            onClick={onSaveEdit}
            disabled={editValue.trim().length === 0}
          >
            Save & resend
          </PillButton>
        </div>
      </div>
    );
  }

  return (
    <div
      className={["group flex flex-col gap-1.5", isUser ? "items-end" : "items-start"].join(" ")}
      data-role={message.role}
    >
      {/* Sender label — small and quiet, gives the messages a clear source
          without bubbles. Only shown for the assistant since the user doesn't
          need to be told who they are. */}
      {!isUser ? (
        <div className="text-ink-mute flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em]">
          <MessageSquareText size={11} strokeWidth={2} className="text-accent" />
          Assistant
        </div>
      ) : null}

      {content ? (
        <div
          className={[
            "max-w-[80%] whitespace-pre-wrap text-[14.5px]",
            isUser ? "text-ink text-right font-medium" : "text-ink-soft",
          ].join(" ")}
          style={{ lineHeight: 1.7, letterSpacing: "-0.005em" }}
        >
          {content}
          {streaming ? <span className="streaming-cursor text-accent" aria-hidden="true" /> : null}
        </div>
      ) : null}

      {message.attachments && message.attachments.length > 0 ? (
        <ul
          className={[
            "m-0 flex list-none flex-wrap gap-1.5 p-0",
            isUser ? "justify-end" : "justify-start",
          ].join(" ")}
        >
          {message.attachments.map((a) => (
            <li
              key={a.id}
              className="bg-bg-soft border-border-soft text-ink-soft inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium"
            >
              <FileText size={11} strokeWidth={1.75} className="text-ink-mute" />
              <span className="max-w-[160px] truncate">{a.name}</span>
              <span className="text-ink-faint">· {formatFileSize(a.size)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Action row — hover-revealed so it doesn't crowd the calm reading
          experience. Streaming hides actions until the reply settles. */}
      {!streaming ? (
        <div
          className={[
            "text-ink-mute flex items-center gap-0.5 opacity-0 transition-opacity duration-150",
            "focus-within:opacity-100 group-hover:opacity-100",
          ].join(" ")}
        >
          {isUser ? (
            <>
              <InlineActionButton
                icon={<Pencil size={11} strokeWidth={1.75} />}
                label="Edit"
                onClick={onStartEdit}
              />
              <InlineActionButton
                icon={<Trash2 size={11} strokeWidth={1.75} />}
                label="Delete"
                onClick={onDelete}
                destructive
              />
            </>
          ) : (
            <>
              <InlineActionButton
                icon={
                  copied ? (
                    <Check size={11} strokeWidth={2.5} />
                  ) : (
                    <Copy size={11} strokeWidth={1.75} />
                  )
                }
                label={copied ? "Copied" : "Copy"}
                onClick={onCopy}
              />
              <InlineActionButton
                icon={<Sparkles size={11} strokeWidth={1.75} />}
                label="Save as suggestion"
                onClick={() => onSave("suggestion", message.content)}
              />
              <InlineActionButton
                icon={<BookOpen size={11} strokeWidth={1.75} />}
                label="Save as template"
                onClick={() => onSave("template", message.content)}
              />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function InlineActionButton({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium transition-colors",
        destructive
          ? "text-ink-mute hover:text-rose hover:bg-rose/10"
          : "text-ink-mute hover:text-ink hover:bg-bg-soft",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ThinkingBubble() {
  return (
    <div className="flex gap-3" aria-live="polite">
      <div className="bg-accent-bg flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
        <MessageSquareText size={14} strokeWidth={1.75} className="text-accent" />
      </div>
      <div className="bg-bg-soft border-border-soft text-ink-mute inline-flex items-center gap-1 rounded-[14px] border px-4 py-3 text-[13px]">
        <Dot delay="0s" />
        <Dot delay="0.18s" />
        <Dot delay="0.36s" />
        <span className="ml-1.5 text-[12px] italic">thinking</span>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      aria-hidden="true"
      className="bg-ink-mute pulse inline-block h-1.5 w-1.5 rounded-full"
      style={{ animationDelay: delay }}
    />
  );
}

type ComposerProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  pending: boolean;
  scopeLabel: string;
  scoped: boolean;
  onOpenScopePicker: () => void;
  attachments: Attachment[];
  onAddAttachments: (files: FileList | File[]) => void;
  onRemoveAttachment: (id: string) => void;
};

const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  {
    value,
    onChange,
    onSubmit,
    pending,
    scopeLabel,
    scoped,
    onOpenScopePicker,
    attachments,
    onAddAttachments,
    onRemoveAttachment,
  },
  ref,
) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  // Refs avoid stale-closure bugs: recognition.onresult fires asynchronously,
  // and `value`/`onChange` change identities across renders.
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  });

  useEffect(() => {
    const Cls = getSpeechRecognitionConstructor();
    if (!Cls) {
      setVoiceSupported(false);
      return;
    }
    setVoiceSupported(true);
    const recognition = new Cls();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result || result.length === 0) continue;
        const alt = result[0];
        if (alt) transcript += alt.transcript;
      }
      const cleaned = transcript.trim();
      if (!cleaned) return;
      const current = valueRef.current;
      const separator = current.length === 0 || current.endsWith(" ") ? "" : " ";
      onChangeRef.current(`${current}${separator}${cleaned}`);
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceError(
          "Microphone access was blocked. Allow it in your browser settings to dictate.",
        );
      } else if (event.error === "no-speech") {
        setVoiceError("Didn't catch that — try again a little closer to the mic.");
      } else {
        setVoiceError("Voice input ran into a problem. Try again.");
      }
      setRecording(false);
    };
    recognition.onend = () => {
      setRecording(false);
    };
    recognition.onstart = () => {
      setVoiceError(null);
    };
    recognitionRef.current = recognition;
    return () => {
      try {
        recognition.abort();
      } catch {
        // Already aborted / never started — safe to ignore.
      }
      recognitionRef.current = null;
    };
  }, []);

  function toggleVoice() {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (recording) {
      try {
        recognition.stop();
      } catch {
        // Already stopped.
      }
      return;
    }
    setVoiceError(null);
    try {
      recognition.start();
      setRecording(true);
    } catch (err) {
      // start() throws InvalidStateError if recognition is already started.
      // Reset state so the next click works.
      setRecording(false);
      setVoiceError("Couldn't start voice input. Try again.");
    }
  }

  function handleSubmit() {
    if (recording) {
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
      setRecording(false);
    }
    onSubmit();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="bg-surface border-border focus-within:border-accent rounded-2xl border p-3 transition-colors md:p-4">
        {/* Hidden file input — clicking the paperclip below triggers it. */}
        {/* PHI WARNING: uploaded files often contain PHI (intake forms,
            assessments, screenshots). Real backend uploads to S3 with KMS-CMK
            envelope encryption and server-side virus + PHI scrubbing before
            anything reaches Bedrock. The mock just tracks file metadata. */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.heic"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onAddAttachments(e.target.files);
            }
            // Allow re-adding the same file in the next session.
            e.target.value = "";
          }}
        />

        {attachments.length > 0 ? (
          <ul className="m-0 mb-2 flex list-none flex-wrap gap-1.5 p-0">
            {attachments.map((a) => (
              <li
                key={a.id}
                className="bg-bg-soft border-border-soft text-ink-soft inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium"
              >
                <FileText size={11} strokeWidth={1.75} className="text-ink-mute" />
                <span className="max-w-[180px] truncate">{a.name}</span>
                <span className="text-ink-faint">· {formatFileSize(a.size)}</span>
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(a.id)}
                  aria-label={`Remove ${a.name}`}
                  className="text-ink-mute hover:text-ink -mr-0.5 ml-0.5 rounded-full p-0.5 transition-colors"
                >
                  <X size={11} strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <label className="sr-only" htmlFor="ai-input">
          Ask the assistant
        </label>
        <textarea
          ref={ref}
          id="ai-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          rows={2}
          placeholder={
            recording
              ? "Listening…"
              : scoped
                ? `Ask about ${scopeLabel}…`
                : "Ask about a client, a pattern, or how to phrase a suggestion…"
          }
          className="text-ink placeholder:text-ink-faint w-full resize-none border-0 bg-transparent px-2 py-2 text-[14px] focus:outline-none"
          style={{ lineHeight: 1.55, letterSpacing: "-0.005em" }}
          disabled={pending}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenScopePicker}
              aria-haspopup="dialog"
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                scoped
                  ? "bg-accent-bg border-accent text-accent"
                  : "bg-bg-soft border-border-soft text-ink-soft hover:text-ink hover:border-accent",
              ].join(" ")}
            >
              <Users size={12} strokeWidth={1.75} />
              {scopeLabel}
              <ChevronDown size={12} strokeWidth={2} className="opacity-70" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pending}
              aria-label="Attach files"
              title="Attach files"
              className="bg-bg-soft border-border-soft text-ink-soft hover:text-ink hover:border-accent inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Paperclip size={14} strokeWidth={1.75} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <VoiceButton
              supported={voiceSupported}
              recording={recording}
              disabled={pending}
              onToggle={toggleVoice}
            />
            <PillButton
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={pending || (value.trim().length === 0 && attachments.length === 0)}
            >
              <Send size={13} strokeWidth={1.75} />
              Send
            </PillButton>
          </div>
        </div>
      </div>

      {voiceError ? (
        <p
          role="alert"
          className="text-rose px-1 text-[12px] font-medium"
          style={{ letterSpacing: "-0.005em" }}
        >
          {voiceError}
        </p>
      ) : null}
    </div>
  );
});

// Five-bar audio-style waveform. Animation is CSS-only (see globals.css) so
// it costs nothing at idle and the bars stagger via inline `animation-delay`.
// Inherits color from the parent — calm accent green inside the listening
// line, but reusable anywhere `currentColor` is set.
const VOICE_WAVE_DELAYS = ["-0.45s", "-0.25s", "0s", "-0.35s", "-0.15s"];

function VoiceWave() {
  return (
    <span className="voice-wave" aria-hidden="true">
      {VOICE_WAVE_DELAYS.map((delay, i) => (
        <span key={i} style={{ animationDelay: delay }} />
      ))}
    </span>
  );
}

function VoiceButton({
  supported,
  recording,
  disabled,
  onToggle,
}: {
  supported: boolean;
  recording: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  if (!supported) {
    return (
      <button
        type="button"
        disabled
        title="Voice input isn't supported in this browser"
        aria-label="Voice input unsupported"
        className="text-ink-faint inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full"
      >
        <MicOff size={15} strokeWidth={1.75} />
      </button>
    );
  }
  // While recording the same button doubles as the listening indicator AND
  // the cancel control. The waveform inside `currentColor`s onto accent green
  // so it reads "calm and active" rather than "alarming" — Attuna's voice
  // matters even in micro-states.
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={recording}
      aria-live={recording ? "polite" : undefined}
      aria-label={recording ? "Stop listening" : "Dictate with voice"}
      title={recording ? "Stop listening" : "Dictate with voice"}
      className={[
        "ease-attuna inline-flex h-9 items-center justify-center rounded-full border transition-all duration-200",
        recording
          ? "bg-accent-bg border-accent text-accent w-14 gap-1"
          : "bg-bg-soft border-border-soft text-ink-soft hover:text-ink hover:border-accent w-9",
        disabled ? "cursor-not-allowed opacity-50" : "",
      ].join(" ")}
    >
      {recording ? <VoiceWave /> : <Mic size={15} strokeWidth={1.75} />}
    </button>
  );
}

function SaveAsModal({
  kind,
  initialContent,
  defaultClientId,
  onClose,
  onSave,
}: {
  kind: SaveKind;
  initialContent: string;
  defaultClientId: string | null;
  onClose: () => void;
  onSave: (item: Omit<SavedItem, "id" | "createdAt">) => void;
}) {
  const isSuggestion = kind === "suggestion";
  const [title, setTitle] = useState(() => deriveDefaultTitle(initialContent));
  const [body, setBody] = useState(initialContent);
  const [theme, setTheme] = useState("");
  // Templates default to practice-wide (null) since they're meant to be
  // reusable; suggestions default to whatever client the assistant was
  // scoped to (or null if practice-wide).
  const [scopeId, setScopeId] = useState<string | null>(
    isSuggestion ? defaultClientId : defaultClientId,
  );

  useEffect(() => {
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
  }, [onClose]);

  const canSave = title.trim().length > 0 && body.trim().length > 0;

  function submit() {
    if (!canSave) return;
    onSave({
      kind,
      title: title.trim(),
      body: body.trim(),
      clientId: scopeId,
      theme: isSuggestion ? theme.trim() || undefined : undefined,
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-modal-title"
      className="fade-in fixed inset-0 z-50 flex items-center justify-center px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "color-mix(in oklab, var(--ink) 35%, transparent)" }}
        aria-hidden="true"
      />
      <div className="bg-surface border-border relative w-full max-w-[520px] rounded-[20px] border p-7 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-ink-mute hover:text-ink hover:bg-bg absolute right-3.5 top-3.5 rounded-full p-1.5 transition-colors"
        >
          <X size={16} strokeWidth={1.75} />
        </button>

        <div className="bg-accent-bg mb-4 inline-flex h-10 w-10 items-center justify-center rounded-[12px]">
          {isSuggestion ? (
            <Sparkles size={16} strokeWidth={1.75} className="text-accent" />
          ) : (
            <BookOpen size={16} strokeWidth={1.75} className="text-accent" />
          )}
        </div>
        <h2
          id="save-modal-title"
          className="display text-ink m-0 mb-1.5 text-[20px] font-medium"
          style={{ letterSpacing: "-0.015em" }}
        >
          Save as {isSuggestion ? "suggestion" : "template"}
        </h2>
        <p className="text-ink-soft mb-5 text-[13px]" style={{ lineHeight: 1.55 }}>
          {isSuggestion
            ? "Suggestions are calm prompts your client sees in their journaling app."
            : "Templates are reusable patterns you can apply to multiple clients later."}
        </p>

        <div className="flex flex-col gap-4">
          <Field label="Title" htmlFor="save-title">
            <Input
              id="save-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isSuggestion ? "A short, calm title" : "Short name for this template"}
            />
          </Field>

          <Field label="Body" htmlFor="save-body">
            <Textarea
              id="save-body"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={isSuggestion ? "For client" : "Assigned client"}
              htmlFor="save-scope"
              hint={
                isSuggestion
                  ? scopeId === null
                    ? "Practice-wide"
                    : "This suggestion lands in their drafts"
                  : scopeId === null
                    ? "Reusable across all clients"
                    : "This template is tied to one client"
              }
            >
              <select
                id="save-scope"
                value={scopeId ?? ""}
                onChange={(e) => setScopeId(e.target.value === "" ? null : e.target.value)}
                className="bg-bg-soft text-ink border-border focus:border-accent w-full rounded-[12px] border px-3.5 py-[13px] text-[14px] font-medium"
              >
                <option value="">{isSuggestion ? "All clients" : "Practice-wide"}</option>
                {CLIENT_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            {isSuggestion ? (
              <Field label="Theme" htmlFor="save-theme" hint="Optional tag — e.g. emotional">
                <Input
                  id="save-theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="emotional"
                />
              </Field>
            ) : (
              <div />
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <PillButton variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton variant="primary" size="sm" onClick={submit} disabled={!canSave}>
            <BookmarkPlus size={13} strokeWidth={1.75} />
            Save
          </PillButton>
        </div>
      </div>
    </div>
  );
}

// Pull the first short sentence-ish chunk to seed the title field. Keeps the
// modal feeling like a draft rather than a blank form.
function deriveDefaultTitle(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length === 0) return "";
  const firstSentence = trimmed.split(/[.!?\n]/)[0] ?? trimmed;
  return firstSentence.length > 60 ? `${firstSentence.slice(0, 57).trim()}…` : firstSentence;
}

function Toast({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fade-in pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
    >
      <div className="bg-ink text-bg pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium shadow-lg">
        <Check size={14} strokeWidth={2} className="text-accent" />
        {message}
      </div>
    </div>
  );
}

function PrivacyFootnote({ scope }: { scope: string | null }) {
  return (
    <div className="text-ink-mute flex items-start gap-2.5 px-1 text-[12px]">
      <Lock size={12} strokeWidth={1.75} className="text-ink-faint mt-0.5 flex-shrink-0" />
      <p className="m-0" style={{ lineHeight: 1.5 }}>
        {scope
          ? `Conversation is scoped to ${scope}. Only their PHI is referenced. Conversations don't train external models. Bedrock under our BAA.`
          : "Observations only, never diagnostic. Conversations don't train external models. PHI flows through Bedrock under our BAA. The assistant declines anything outside your practice scope."}
      </p>
    </div>
  );
}
