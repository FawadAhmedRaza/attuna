"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";

export function EditSuggestionLink({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <button
      type="button"
      onClick={() => {
        const next = new URLSearchParams(searchParams);
        next.delete("new");
        next.set("edit", id);
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      }}
      className="text-accent inline-flex items-center gap-1 text-[12px] font-semibold transition-all hover:gap-1.5"
    >
      Edit <ArrowRight size={12} strokeWidth={1.75} />
    </button>
  );
}

export default EditSuggestionLink;
