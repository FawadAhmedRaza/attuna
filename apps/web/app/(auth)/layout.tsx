import { AuthShell } from "@attuna/ui/AuthShell";

import { ThemeToggle } from "@/lib/ThemeToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell themeToggle={<ThemeToggle />}>{children}</AuthShell>;
}
