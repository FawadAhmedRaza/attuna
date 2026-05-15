import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@attuna/ui/AuthShell";
import { db } from "@attuna/db/client";
import { createKmsClient } from "@attuna/db/lib/kms";
import { clientRepo } from "@attuna/db/repositories/client-repo";
import { entryRepo } from "@attuna/db/repositories/entry-repo";
import { workspaceRepo } from "@attuna/db/repositories/workspace-repo";

import { requireClientSession } from "@/lib/auth/require-client";
import { ThemeToggle } from "@/lib/ThemeToggle";

import { JournalView } from "./JournalView";

export const metadata: Metadata = { title: "Your journal" };

export default async function JournalPage() {
  const session = await requireClientSession();
  if (!session) {
    // No valid client session. Send them to the home page rather than
    // /signin (which is the therapist sign-in surface). When mobile
    // launches in M2.3b, this becomes a deep link to the app.
    redirect("/");
  }

  const [ws, clientName, entries] = await Promise.all([
    workspaceRepo.findByIdUnscoped(db(), session.workspaceId),
    clientRepo.findDisplayNameForInvite(db(), session.workspaceId, session.clientId),
    entryRepo.listAsClient(db(), createKmsClient(), session),
  ]);

  return (
    <AuthShell themeToggle={<ThemeToggle />} wide>
      <JournalView
        workspaceName={ws?.name ?? "your therapist"}
        displayName={clientName ?? "you"}
        entries={entries.map((e) => ({
          id: e.id,
          body: e.body,
          wordCount: e.wordCount,
          writtenAtIso: e.writtenAt.toISOString(),
        }))}
      />
      <p className="text-ink-faint mt-6 text-center text-[11px] italic">
        <Link href="/" className="hover:text-ink-soft">
          Sign out of journal
        </Link>
      </p>
    </AuthShell>
  );
}
