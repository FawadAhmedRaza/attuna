"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Building2,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Moon,
  Plug,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Logo } from "@attuna/ui/Logo";
import { LogoMark } from "@attuna/ui/LogoMark";

import { signOutAction } from "@/lib/auth/actions";
import { ROLE_LABELS, useRole, type Permission } from "@/lib/rbac";
import { useTheme } from "@/lib/use-theme";

type NavItem = {
  /** Path suffix relative to `/w/[slug]`, e.g. "today" or "clients". */
  segment: string;
  icon: LucideIcon;
  label: string;
  count?: number;
  permission?: Permission;
};

const NAV: NavItem[] = [
  { segment: "today", icon: LayoutDashboard, label: "Today" },
  { segment: "calendar", icon: Calendar, label: "Calendar" },
  { segment: "clients", icon: Users, label: "Clients", count: 4 },
  { segment: "suggestions", icon: Sparkles, label: "Suggestions" },
  { segment: "templates", icon: BookOpen, label: "Templates" },
];

const ADMIN_NAV: NavItem[] = [
  { segment: "clinic", icon: Building2, label: "Clinic", permission: "view_clinic" },
  {
    segment: "settings/members",
    icon: UserCog,
    label: "Members",
    permission: "manage_therapists",
  },
  { segment: "audit", icon: ScrollText, label: "Audit log", permission: "view_audit" },
  {
    segment: "integrations",
    icon: Plug,
    label: "Integrations",
    permission: "manage_integrations",
  },
  { segment: "billing", icon: CreditCard, label: "Billing", permission: "view_billing" },
  { segment: "roles", icon: ShieldCheck, label: "Roles", permission: "manage_roles" },
];

const COLLAPSED_KEY = "attuna_sidebar_collapsed_v1";

export type SidebarWorkspace = { slug: string; name: string };

export function PortalSidebar({
  name,
  activeSlug,
  workspaces,
}: {
  name: string;
  activeSlug: string;
  workspaces: SidebarWorkspace[];
}) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { role, can } = useRole();
  const [collapsed, setCollapsed] = useState(false);
  const visibleAdmin = ADMIN_NAV.filter((item) => !item.permission || can(item.permission));

  const activeWorkspace = workspaces.find((w) => w.slug === activeSlug);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {}
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const hrefFor = (segment: string) => `/w/${activeSlug}/${segment}`;
  const isActive = (segment: string) => {
    const target = hrefFor(segment);
    return pathname === target || pathname.startsWith(target + "/");
  };

  return (
    <aside
      className={[
        "bg-bg-soft border-border ease-attuna sticky top-0 hidden h-screen flex-shrink-0 flex-col border-r transition-[width] duration-200 md:flex",
        collapsed ? "w-[68px]" : "w-[248px]",
      ].join(" ")}
    >
      <div
        className={[
          "border-border flex items-center border-b pb-4 pt-5",
          collapsed ? "flex-col gap-3 px-2" : "justify-between px-5",
        ].join(" ")}
      >
        <div className="min-w-0">
          {collapsed ? (
            <div className="flex justify-center">
              <LogoMark size={26} />
            </div>
          ) : (
            <>
              <Logo small />
              {activeWorkspace ? (
                <div className="text-ink-mute mt-2 truncate text-[11px] font-medium">
                  {activeWorkspace.name}
                </div>
              ) : null}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          title={collapsed ? "Expand" : "Collapse"}
          className="text-ink-mute hover:text-ink hover:bg-bg rounded-md p-1.5 transition-colors"
        >
          {collapsed ? (
            <ChevronRight size={14} strokeWidth={2} />
          ) : (
            <ChevronLeft size={14} strokeWidth={2} />
          )}
        </button>
      </div>

      <nav className={["flex-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3"].join(" ")}>
        {workspaces.length > 1 ? (
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeSlug={activeSlug}
            collapsed={collapsed}
          />
        ) : null}

        {!collapsed ? <SectionLabel>Workspace</SectionLabel> : null}
        {NAV.map((item) => (
          <NavLink
            key={item.segment}
            href={hrefFor(item.segment)}
            icon={item.icon}
            label={item.label}
            count={item.count}
            collapsed={collapsed}
            active={isActive(item.segment)}
          />
        ))}

        {visibleAdmin.length > 0 ? (
          <>
            {!collapsed ? <SectionLabel className="pt-5">Admin</SectionLabel> : null}
            {collapsed ? <CollapsedDivider /> : null}
            {visibleAdmin.map((item) => (
              <NavLink
                key={item.segment}
                href={hrefFor(item.segment)}
                icon={item.icon}
                label={item.label}
                count={item.count}
                collapsed={collapsed}
                active={isActive(item.segment)}
              />
            ))}
          </>
        ) : null}
      </nav>

      <div className={["border-border border-t", collapsed ? "p-2" : "p-3.5"].join(" ")}>
        {collapsed ? (
          <Link
            href="/account"
            aria-label="Your account"
            title={`${name} · ${ROLE_LABELS[role]}`}
            className="hover:bg-bg mb-2 flex justify-center rounded-full p-1 transition-colors"
          >
            <div className="display bg-warm text-ink-on-accent flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-[13px] font-medium">
              {initial}
            </div>
          </Link>
        ) : (
          <Link
            href="/account"
            className="hover:bg-bg mb-1.5 flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 transition-colors"
          >
            <div className="display bg-warm text-ink-on-accent flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-[13px] font-medium">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="text-ink truncate text-[12px] font-semibold"
                style={{ letterSpacing: "-0.005em" }}
              >
                {name}
              </div>
              <div className="text-ink-mute flex items-center gap-1.5 text-[10px] font-medium">
                <span className="bg-accent-bg text-accent rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.04em]">
                  {ROLE_LABELS[role]}
                </span>
                <span>Trial · 28d left</span>
              </div>
            </div>
          </Link>
        )}

        <FooterRow
          icon={theme === "light" ? Moon : Sun}
          onClick={toggle}
          collapsed={collapsed}
          tooltip={theme === "light" ? "Dark mode" : "Light mode"}
        >
          {theme === "light" ? "Dark mode" : "Light mode"}
        </FooterRow>

        <FooterRow
          icon={Settings}
          href={hrefFor("settings")}
          active={isActive("settings")}
          collapsed={collapsed}
          tooltip="Settings"
        >
          Settings
        </FooterRow>

        <form action={signOutAction}>
          <FooterRow icon={LogOut} type="submit" collapsed={collapsed} tooltip="Sign out">
            Sign out
          </FooterRow>
        </form>
      </div>
    </aside>
  );
}

function WorkspaceSwitcher({
  workspaces,
  activeSlug,
  collapsed,
}: {
  workspaces: SidebarWorkspace[];
  activeSlug: string;
  collapsed: boolean;
}) {
  if (collapsed) {
    return (
      <>
        {workspaces.map((w) => {
          const active = w.slug === activeSlug;
          return (
            <Link
              key={w.slug}
              href={`/w/${w.slug}/today`}
              title={w.name}
              aria-label={`Switch to ${w.name}`}
              className={[
                "tracking-body mb-0.5 flex h-10 w-full items-center justify-center rounded-[10px] transition-colors",
                active
                  ? "bg-accent-bg text-accent font-semibold"
                  : "text-ink-soft hover:text-ink font-medium",
              ].join(" ")}
            >
              <span className="display bg-surface-deep flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-semibold">
                {w.name.trim().charAt(0).toUpperCase() || "?"}
              </span>
            </Link>
          );
        })}
        <CollapsedDivider />
      </>
    );
  }

  return (
    <div className="mb-3">
      <SectionLabel>Workspaces</SectionLabel>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {workspaces.map((w) => {
          const active = w.slug === activeSlug;
          return (
            <li key={w.slug}>
              <Link
                href={`/w/${w.slug}/today`}
                aria-current={active ? "page" : undefined}
                className={[
                  "tracking-body flex items-center justify-between rounded-[10px] px-3 py-2 text-[13px] transition-colors",
                  active
                    ? "bg-accent-bg text-accent font-semibold"
                    : "text-ink-soft hover:text-ink font-medium",
                ].join(" ")}
              >
                <span className="truncate">{w.name}</span>
                {active ? <Check size={13} strokeWidth={2} /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  count,
  collapsed,
  active,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  count?: number;
  collapsed: boolean;
  active: boolean;
}) {
  const baseCls = [
    "mb-0.5 flex items-center rounded-[10px] transition-colors tracking-body",
    active ? "bg-accent-bg text-accent font-semibold" : "text-ink-soft hover:text-ink font-medium",
  ].join(" ");

  if (collapsed) {
    return (
      <Link
        href={href}
        title={label + (count ? ` · ${count}` : "")}
        aria-label={label}
        className={[baseCls, "relative h-10 w-full justify-center"].join(" ")}
      >
        <Icon size={16} strokeWidth={1.75} />
        {count ? (
          <span className="bg-accent absolute right-1.5 top-1.5 h-2 w-2 rounded-full" />
        ) : null}
      </Link>
    );
  }

  return (
    <Link href={href} className={[baseCls, "justify-between px-3 py-2 text-[13px]"].join(" ")}>
      <span className="flex items-center gap-2.5">
        <Icon size={14} strokeWidth={1.75} />
        {label}
      </span>
      {count ? (
        <span className="bg-surface-deep text-ink-mute rounded-full px-1.5 py-px text-[10px] font-semibold">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

function CollapsedDivider() {
  return (
    <div className="my-2 flex justify-center" aria-hidden="true">
      <div className="bg-border-soft h-px w-6" />
    </div>
  );
}

function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "text-ink-faint mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.06em]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function FooterRow({
  icon: Icon,
  children,
  onClick,
  type = "button",
  disabled = false,
  href,
  active = false,
  collapsed = false,
  tooltip,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  href?: string;
  active?: boolean;
  collapsed?: boolean;
  tooltip?: string;
}) {
  const cls = [
    "tracking-body flex w-full items-center rounded-[10px] transition-colors disabled:opacity-60 disabled:hover:bg-transparent",
    active ? "bg-accent-bg text-accent font-semibold" : "text-ink-soft hover:text-ink hover:bg-bg",
    collapsed ? "h-10 justify-center" : "gap-2.5 px-3 py-2 text-[12px] font-medium",
  ].join(" ");

  const iconSize = collapsed ? 15 : 13;

  if (href) {
    return (
      <Link href={href} className={cls} title={collapsed ? tooltip : undefined}>
        <Icon size={iconSize} strokeWidth={1.75} />
        {!collapsed ? children : null}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cls}
      title={collapsed ? tooltip : undefined}
      aria-label={collapsed && tooltip ? tooltip : undefined}
    >
      <Icon size={iconSize} strokeWidth={1.75} />
      {!collapsed ? children : null}
    </button>
  );
}

export default PortalSidebar;
