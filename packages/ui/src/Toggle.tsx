"use client";

import { useId } from "react";

type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
};

export function Toggle({ checked, onChange, label, description, disabled = false }: ToggleProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={[
        "flex items-start justify-between gap-4",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      ].join(" ")}
    >
      <div>
        <div
          className="text-ink tracking-body text-[14px] font-semibold"
          style={{ letterSpacing: "-0.005em" }}
        >
          {label}
        </div>
        {description ? (
          <div className="text-ink-mute mt-1 text-[12px]" style={{ lineHeight: 1.5 }}>
            {description}
          </div>
        ) : null}
      </div>
      <span className="relative mt-0.5 inline-flex flex-shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-checked={checked}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={[
            "inline-block h-[22px] w-[36px] rounded-full transition-colors",
            checked ? "bg-accent" : "bg-surface-deep",
          ].join(" ")}
        />
        <span
          aria-hidden="true"
          className={[
            "absolute left-[2px] top-[2px] h-[18px] w-[18px] rounded-full transition-transform",
            "bg-surface shadow-sm",
            checked ? "translate-x-[14px]" : "translate-x-0",
          ].join(" ")}
        />
      </span>
    </label>
  );
}

export default Toggle;
