import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { themeScript } from "@/lib/theme-script";

import "./globals.css";

// Single sans-serif family powers both the sidebar and the rest of the app.
// The display variable still exists so .display / .display-md / .display-text
// callers keep working — they now just render in the same family at heavier
// weights, with serif kept as the absolute fallback.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const jakartaDisplay = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://attuna.io"),
  title: {
    default: "Attuna — A quiet assistant for therapists",
    template: "%s · Attuna",
  },
  description:
    "Attuna is a calm assistant for therapists. It reads what your clients write between sessions, surfaces patterns gently, and helps you arrive prepared — without ever replacing your judgment.",
  applicationName: "Attuna",
  authors: [{ name: "Attuna" }],
  keywords: ["therapy", "therapist software", "session prep", "HIPAA", "client journaling"],
  openGraph: {
    type: "website",
    title: "Attuna — A quiet assistant for therapists",
    description:
      "Calm session prep, built from what your clients write between visits. HIPAA-compliant, observational, never diagnostic.",
    siteName: "Attuna",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Attuna — A quiet assistant for therapists",
    description: "Calm session prep, built from what your clients write between visits.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F7F2" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1814" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakartaDisplay.variable} ${jakarta.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
