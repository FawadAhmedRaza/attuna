import type { ReactNode } from "react";

type FieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  action?: ReactNode;
  error?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, hint, action, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-ink-soft tracking-body text-[12px] font-semibold">
          {label}
        </label>
        {action ? <div className="text-[12px]">{action}</div> : null}
      </div>
      {children}
      {error ? (
        <p className="text-rose tracking-body text-[12px] font-medium" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-ink-mute tracking-body text-[12px]">{hint}</p>
      ) : null}
    </div>
  );
}

export default Field;
