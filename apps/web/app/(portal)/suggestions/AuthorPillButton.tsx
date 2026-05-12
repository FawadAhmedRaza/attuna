"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { PillButton } from "@attuna/ui/PillButton";

export function AuthorPillButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <PillButton
      variant="primary"
      size="sm"
      onClick={() => {
        const next = new URLSearchParams(searchParams);
        next.set("new", "1");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      }}
    >
      <Plus size={14} strokeWidth={1.75} />
      Author suggestion
    </PillButton>
  );
}

export default AuthorPillButton;
