import type { Metadata } from "next";

import { PageHeader } from "../_components/PageHeader";

import { ClientsList, InvitePillButton, type ClientRow } from "./ClientsList";
import { InviteClientModal } from "./InviteClientModal";
import { getAllClients } from "./_mock";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  // Strip down to display fields so nothing crosses the RSC boundary that
  // can't be serialized (e.g. lucide icon refs on `insights`).
  const rows: ClientRow[] = getAllClients().map((c) => ({
    id: c.id,
    name: c.name,
    initial: c.initial,
    status: c.status,
    emotion: c.emotion,
    trend: c.trend,
    entries: c.entries,
    days: c.days,
    lastSession: c.lastSession,
  }));

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader eyebrow="Your practice" title="All clients" action={<InvitePillButton />} />
      <ClientsList clients={rows} />
      <InviteClientModal />
    </div>
  );
}
