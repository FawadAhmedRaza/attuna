"use client";

import { useEffect, useState } from "react";
import { Check, Smartphone } from "lucide-react";

type Props = {
  token: string;
  workspaceName: string;
  clientDisplayName: string;
  invitedEmail: string;
};

// Two flavors:
//   • Mobile browser → big "Open in app" CTA that fires the universal
//     link. If the app isn't installed, the browser stays on this page
//     and the message below is the obvious next step.
//   • Desktop browser → primary message is "open this link on your
//     phone" since the mobile app is the only journaling surface.
//
// The token IS embedded in the universal-link href, which is the same
// shape the email link uses (https://attuna.io/c/<token>). It does
// not leave the URL — no fetch, no client-side state holds it.

export function InstallAppCard({ token, workspaceName, clientDisplayName, invitedEmail }: Props) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    // Client-only so SSR + first paint match. /Mobi/ is the broadly-
    // used UA needle; we don't care about distinguishing iOS from
    // Android here.
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
  }, []);

  // Universal-link / deep-link target. In production the App Store
  // associated-domains entitlement makes attuna.io/c/<token> open
  // the mobile app directly; here we just point at it. The custom
  // scheme `attuna://c/<token>` is a fallback for the dev simulator
  // when no universal link is wired.
  const appUrl = `https://attuna.io/c/${token}`;

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
          {clientDisplayName === "you"
            ? "Your therapist has invited you to write between sessions."
            : `Your therapist invited "${clientDisplayName}" to write between sessions.`}{" "}
          Only they read what you write — no AI, no streaks, no audience.
        </p>
        <p className="text-ink-mute mt-4 text-[12px] font-medium">Sent to {invitedEmail}.</p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {isMobile ? (
          <a
            href={appUrl}
            className="bg-accent text-ink-on-accent ease-attuna inline-flex w-full items-center justify-center gap-2 rounded-full px-[22px] py-[13px] text-[14px] font-semibold transition-all duration-200"
          >
            <Smartphone size={15} strokeWidth={1.75} />
            Open in the Attuna app
          </a>
        ) : (
          <div
            className="bg-bg-soft border-border-soft rounded-[14px] border px-5 py-4"
            role="note"
          >
            <div className="flex items-start gap-3">
              <Smartphone
                size={18}
                strokeWidth={1.75}
                className="text-accent mt-0.5 flex-shrink-0"
              />
              <div>
                <div className="text-ink text-[14px] font-semibold">Open this on your phone.</div>
                <p
                  className="text-ink-soft tracking-body mt-1 text-[13px]"
                  style={{ lineHeight: 1.55 }}
                >
                  Journaling lives in the Attuna mobile app. Tap the invite link in your email from
                  a phone, or scan a QR code if your therapist shared one.
                </p>
              </div>
            </div>
          </div>
        )}

        <PrivacyNote />
      </div>
    </div>
  );
}

function PrivacyNote() {
  return (
    <div className="bg-bg-soft border-border-soft mt-2 rounded-[14px] border px-5 py-4">
      <div className="flex items-start gap-3">
        <Check size={16} strokeWidth={2} className="text-accent mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-ink text-[13px] font-semibold">Encrypted, not analyzed.</div>
          <p
            className="text-ink-soft tracking-body mt-1 text-[12.5px]"
            style={{ lineHeight: 1.55 }}
          >
            Your entries leave your phone encrypted. We can&apos;t read them. Your phone provider
            can&apos;t read them. Only your therapist can.
          </p>
        </div>
      </div>
    </div>
  );
}
