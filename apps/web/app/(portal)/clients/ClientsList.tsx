"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, ChevronsUpDown, Plus, Search, X } from "lucide-react";

import { Input } from "@attuna/ui/Input";
import { PillButton } from "@attuna/ui/PillButton";

// Display-only fields (everything passable across the RSC boundary — no
// lucide component refs).
export type ClientRow = {
  id: string;
  name: string;
  initial: string;
  status: "ready" | "data" | "wait";
  emotion: string;
  trend: string;
  entries: number;
  days: number;
  lastSession: string;
};

type SortField = "name" | "status" | "entries" | "lastSession";
type SortDir = "asc" | "desc";

type StatusFilter = "all" | "ready" | "data" | "wait";

const STATUS_PILLS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ready", label: "Active" },
  { id: "data", label: "Building data" },
  { id: "wait", label: "Just started" },
];

const STATUS_RANK: Record<ClientRow["status"], number> = { ready: 0, data: 1, wait: 2 };

function lastSessionDays(text: string): number {
  const m = text.match(/(\d+)/);
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
}

export function ClientsList({ clients }: { clients: ClientRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const status = (searchParams.get("status") ?? "all") as StatusFilter;
  const sort = (searchParams.get("sort") ?? "name") as SortField;
  const dir = (searchParams.get("dir") ?? "asc") as SortDir;

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, val] of Object.entries(patch)) {
      if (val === null || val === "") next.delete(key);
      else next.set(key, val);
    }
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function toggleSort(field: SortField) {
    if (sort === field) {
      update({ dir: dir === "asc" ? "desc" : "asc" });
    } else {
      update({ sort: field, dir: "asc" });
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let rows = clients;
    if (status !== "all") rows = rows.filter((c) => c.status === status);
    if (needle) {
      rows = rows.filter(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          c.emotion.toLowerCase().includes(needle) ||
          c.trend.toLowerCase().includes(needle),
      );
    }
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sort === "name") cmp = a.name.localeCompare(b.name);
      else if (sort === "entries") cmp = a.entries - b.entries;
      else if (sort === "status") cmp = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      else if (sort === "lastSession")
        cmp = lastSessionDays(a.lastSession) - lastSessionDays(b.lastSession);
      return dir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [clients, q, status, sort, dir]);

  const totalActive = clients.filter((c) => c.status !== "wait").length;
  const totalJustStarted = clients.filter((c) => c.status === "wait").length;

  return (
    <>
      <div
        className="text-ink-mute mb-3 text-[12px] font-medium uppercase tracking-[0.04em]"
        aria-live="polite"
      >
        {totalActive} active · {totalJustStarted} just started
      </div>

      <Toolbar
        q={q}
        onQueryChange={(value) => update({ q: value || null })}
        status={status}
        onStatusChange={(s) => update({ status: s === "all" ? null : s })}
      />

      <div className="bg-surface border-border overflow-hidden rounded-2xl border">
        <ListHeader sort={sort} dir={dir} onSort={toggleSort} />
        {filtered.length === 0 ? (
          <EmptyState onClear={() => update({ q: null, status: null })} />
        ) : (
          filtered.map((c, i) => (
            <ClientRowLink key={c.id} client={c} isLast={i === filtered.length - 1} />
          ))
        )}
      </div>
    </>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────

function Toolbar({
  q,
  onQueryChange,
  status,
  onStatusChange,
}: {
  q: string;
  onQueryChange: (value: string) => void;
  status: StatusFilter;
  onStatusChange: (next: StatusFilter) => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full max-w-[320px]">
        <Input
          type="search"
          aria-label="Search clients"
          placeholder="Search by name or emotion"
          leftIcon={Search}
          value={q}
          onChange={(e) => onQueryChange(e.target.value)}
          rightSlot={
            q ? (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                aria-label="Clear search"
                className="text-ink-mute hover:text-ink rounded-md p-1.5 transition-colors"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            ) : null
          }
        />
      </div>
      <div
        className="border-border flex flex-wrap gap-1 rounded-full border p-1"
        role="tablist"
        aria-label="Status filter"
      >
        {STATUS_PILLS.map((p) => {
          const active = status === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onStatusChange(p.id)}
              className={[
                "tracking-body rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                active ? "bg-accent text-ink-on-accent" : "text-ink-soft hover:text-ink",
              ].join(" ")}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Header (sortable) ────────────────────────────────────────────────

const GRID = "grid grid-cols-[2fr_1fr_100px] md:grid-cols-[2fr_1fr_1fr_1fr_100px]";

function ListHeader({
  sort,
  dir,
  onSort,
}: {
  sort: SortField;
  dir: SortDir;
  onSort: (field: SortField) => void;
}) {
  return (
    <div
      className={`${GRID} border-border text-ink-mute gap-4 border-b px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.04em] md:px-6`}
    >
      <SortHeader field="name" current={sort} dir={dir} onSort={onSort}>
        Client
      </SortHeader>
      <SortHeader
        field="status"
        current={sort}
        dir={dir}
        onSort={onSort}
        className="hidden md:flex"
      >
        Status
      </SortHeader>
      <SortHeader
        field="entries"
        current={sort}
        dir={dir}
        onSort={onSort}
        className="hidden md:flex"
      >
        Entries
      </SortHeader>
      <SortHeader
        field="lastSession"
        current={sort}
        dir={dir}
        onSort={onSort}
        className="hidden md:flex"
      >
        Last session
      </SortHeader>
      <span>Brief</span>
      <span className="md:hidden">Status</span>
    </div>
  );
}

function SortHeader({
  field,
  current,
  dir,
  onSort,
  children,
  className = "",
}: {
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const active = current === field;
  const Icon = active ? (dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <div
      role="columnheader"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={className}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={[
          "hover:text-ink-soft -my-1 inline-flex items-center gap-1 py-1 text-left text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors",
          active ? "text-ink-soft" : "text-ink-mute",
        ].join(" ")}
      >
        {children}
        <Icon size={11} strokeWidth={2} />
      </button>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────

function ClientRowLink({ client, isLast }: { client: ClientRow; isLast: boolean }) {
  return (
    <Link
      href={`/clients/${client.id}`}
      className={[
        GRID,
        "hover:bg-bg-soft items-center gap-4 px-5 py-4 transition-colors md:px-6",
        isLast ? "" : "border-border-soft border-b",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="display bg-accent-bg text-accent flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[14px] font-medium">
          {client.initial}
        </div>
        <div className="min-w-0">
          <div
            className="display text-ink truncate text-[15px] font-medium"
            style={{ letterSpacing: "-0.015em" }}
          >
            {client.name}
          </div>
          <div className="text-ink-mute truncate text-[11px] font-medium">
            {client.emotion} · {client.trend}
          </div>
        </div>
      </div>
      <div className="hidden md:block">
        <StatusPill status={client.status} />
      </div>
      <div className="hidden text-[13px] md:block">
        <span className="text-ink font-medium">{client.entries}</span>{" "}
        <span className="text-ink-mute text-[11px] font-medium">over {client.days}d</span>
      </div>
      <div className="text-ink-soft hidden text-[13px] font-medium md:block">
        {client.lastSession}
      </div>
      <BriefIndicator status={client.status} />
      <div className="md:hidden">
        <StatusPill status={client.status} />
      </div>
    </Link>
  );
}

function StatusPill({ status }: { status: ClientRow["status"] }) {
  const label =
    status === "ready" ? "Active" : status === "data" ? "Building data" : "Just started";
  const cls =
    status === "ready"
      ? "bg-accent-bg text-accent"
      : status === "data"
        ? "bg-warm-bg text-warm"
        : "bg-surface-deep text-ink-mute";
  return (
    <span className={`${cls} inline-block rounded-full px-2.5 py-[3px] text-[11px] font-semibold`}>
      {label}
    </span>
  );
}

function BriefIndicator({ status }: { status: ClientRow["status"] }) {
  if (status !== "ready") {
    return <span className="text-ink-mute text-[11px] font-medium">—</span>;
  }
  return (
    <span className="text-accent inline-flex items-center gap-1.5 text-[11px] font-semibold">
      <span className="bg-accent h-[5px] w-[5px] rounded-full" />
      Ready
    </span>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-ink-soft text-[14px]">No clients match those filters.</p>
      <PillButton variant="ghost" size="sm" onClick={onClear}>
        Clear filters
      </PillButton>
    </div>
  );
}

// ─── Header CTA — Plus icon helper for the page invite button ─────────

export function InvitePillButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <PillButton
      variant="primary"
      size="sm"
      onClick={() => {
        const next = new URLSearchParams(searchParams);
        next.set("invite", "1");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      }}
    >
      <Plus size={14} strokeWidth={1.75} />
      Invite client
    </PillButton>
  );
}
