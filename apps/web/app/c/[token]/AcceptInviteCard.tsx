"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Check } from "lucide-react";

import { PillButton } from "@attuna/ui/PillButton";

import { acceptClientInviteAction, type AcceptClientInviteResult } from "./_actions";

type Props = {
  token: string;
  workspaceName: string;
  clientDisplayName: string;
  invitedEmail: string;
};

export function AcceptInviteCard({ token, workspaceName, clientDisplayName, invitedEmail }: Props) {
  const [state, action] = useFormState<AcceptClientInviteResult | null, FormData>(
    acceptClientInviteAction,
    null,
  );

  if (state?.ok) {
    return (
      <div className="bg-surface border-border rounded-[20px] border p-8 text-center md:p-10">
        <div
          className="bg-accent-bg mx-auto mb-6 flex h-[64px] w-[64px] items-center justify-center rounded-full"
          style={{ border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)" }}
        >
          <Check size={28} strokeWidth={2} className="text-accent" />
        </div>
        <h1
          className="display text-ink m-0 text-[28px] font-medium md:text-[32px]"
          style={{ letterSpacing: "-0.02em", lineHeight: 1.15 }}
        >
          You&apos;re in.
        </h1>
        <p
          className="text-ink-soft tracking-body mx-auto mt-3 max-w-[380px] text-[14px]"
          style={{ lineHeight: 1.55 }}
        >
          Install the Attuna mobile app to start journaling. Your therapist will see your entries
          between sessions — no one else.
        </p>
        <p className="text-ink-mute mt-6 text-[12px] italic">
          (Mobile app arrives in M2.3 — this preview just confirms the invite was accepted.)
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border-border rounded-[20px] border p-8 md:p-10">
      <div className="text-center">
        <div className="text-ink-mute text-[11px] font-semibold uppercase tracking-[0.06em]">
          You&apos;re invited to journal
        </div>
        <h1
          className="display text-ink mt-3 text-[28px] font-medium md:text-[32px]"
          style={{ letterSpacing: "-0.02em", lineHeight: 1.15 }}
        >
          {workspaceName}
        </h1>
        <p
          className="text-ink-soft tracking-body mx-auto mt-4 max-w-[400px] text-[14px]"
          style={{ lineHeight: 1.6 }}
        >
          {clientDisplayName === "your client"
            ? "Your therapist has invited you to write between sessions."
            : `Your therapist has invited "${clientDisplayName}" to write between sessions.`}{" "}
          Only they will read what you write — no AI, no streaks, no audience.
        </p>
        <p className="text-ink-mute mt-4 text-[12px] font-medium">
          This invite was sent to {invitedEmail}.
        </p>
      </div>

      <form action={action} className="mt-7 flex flex-col items-center gap-3">
        <input type="hidden" name="token" value={token} />
        <Submit />
        {state?.ok === false ? (
          <p className="text-rose text-center text-[13px] font-medium" role="alert">
            {state.error}
          </p>
        ) : null}
        <p
          className="display-text text-ink-faint mt-2 text-center text-[12px] italic"
          style={{ letterSpacing: "-0.005em" }}
        >
          Attuna stores your entries encrypted. Only your therapist can read them.
        </p>
      </form>
    </div>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <PillButton
      type="submit"
      variant="primary"
      size="md"
      disabled={pending}
      aria-busy={pending || undefined}
      style={{ width: "100%", maxWidth: 280 }}
    >
      {pending ? "Accepting…" : "Accept invitation"}
    </PillButton>
  );
}
