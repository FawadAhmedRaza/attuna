import type { ReactNode } from "react";

import { Eyebrow } from "@attuna/ui/Eyebrow";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function PageHeader({ eyebrow, title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="mb-3">
        <Eyebrow flanked={false}>{eyebrow}</Eyebrow>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="display text-ink m-0 text-[32px] font-medium md:text-[40px]"
            style={{ letterSpacing: "-0.025em", lineHeight: 1.05 }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              className="text-ink-soft mt-2 text-[14px] font-medium md:text-[15px]"
              style={{ letterSpacing: "-0.005em" }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? <div className="print-hide flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  );
}

export default PageHeader;
