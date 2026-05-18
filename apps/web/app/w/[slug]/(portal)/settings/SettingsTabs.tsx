"use client";

import { useEffect, useState } from "react";
import { Award, Bell, Building2, Lock, Shield, User, type LucideIcon } from "lucide-react";

import { useRole, type Permission } from "@/lib/rbac";

import {
  ClinicCard,
  CredentialsCard,
  NotificationsCard,
  PrivacyCard,
  ProfileCard,
  SecurityCard,
} from "./SettingsForms";

type TabConfig = {
  id: TabId;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
};

type TabId = "profile" | "credentials" | "clinic" | "notifications" | "security" | "privacy";

// Order matters — this is the visual order in the nav. Permission gates each
// tab; an undefined permission means "everyone signed in sees this".
const TABS: TabConfig[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "credentials", label: "Credentials", icon: Award, permission: "view_clients" },
  { id: "clinic", label: "Clinic", icon: Building2, permission: "manage_clinic" },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Lock },
  { id: "privacy", label: "Privacy", icon: Shield },
];

export function SettingsTabs({ name, email }: { name: string; email: string }) {
  const { can, role } = useRole();
  const visibleTabs = TABS.filter((t) => !t.permission || can(t.permission));
  const [tab, setTab] = useState<TabId>("profile");

  // If the active tab disappears after a role change (e.g. switching to
  // therapist while sitting on Clinic), fall back to Profile rather than
  // rendering an empty panel.
  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === tab)) {
      setTab("profile");
    }
  }, [role, tab, visibleTabs]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr] md:gap-8">
      <nav aria-label="Settings sections" className="min-w-0 md:sticky md:top-6 md:self-start">
        <ul
          role="tablist"
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:p-0"
        >
          {visibleTabs.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <li key={t.id} className="shrink-0 md:shrink">
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`panel-${t.id}`}
                  id={`tab-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={[
                    "flex items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors",
                    "md:w-full md:justify-start md:rounded-[10px] md:border-transparent",
                    active
                      ? "bg-accent-bg border-accent text-accent"
                      : "bg-surface border-border text-ink-soft hover:text-ink md:hover:bg-bg-soft md:bg-transparent",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0">
        <Panel id="profile" active={tab === "profile"}>
          <ProfileCard name={name} email={email} />
        </Panel>
        <Panel id="credentials" active={tab === "credentials"}>
          <CredentialsCard />
        </Panel>
        <Panel id="clinic" active={tab === "clinic"}>
          <ClinicCard />
        </Panel>
        <Panel id="notifications" active={tab === "notifications"}>
          <NotificationsCard />
        </Panel>
        <Panel id="security" active={tab === "security"}>
          <SecurityCard />
        </Panel>
        <Panel id="privacy" active={tab === "privacy"}>
          <PrivacyCard />
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  id,
  active,
  children,
}: {
  id: TabId;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      hidden={!active}
      className={active ? undefined : "hidden"}
    >
      {children}
    </div>
  );
}
