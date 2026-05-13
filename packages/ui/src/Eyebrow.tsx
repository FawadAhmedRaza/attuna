import type { ReactNode } from "react";

type EyebrowProps = {
  children: ReactNode;
  flanked?: boolean;
};

export function Eyebrow({ children, flanked = true }: EyebrowProps) {
  return (
    <div className="text-warm tracking-body inline-flex items-center gap-2 text-[13px] font-semibold">
      <span aria-hidden="true">✦</span>
      <span>{children}</span>
      {flanked ? <span aria-hidden="true">✦</span> : null}
    </div>
  );
}

export default Eyebrow;
