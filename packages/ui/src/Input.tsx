import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  leftIcon?: LucideIcon;
  rightSlot?: ReactNode;
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leftIcon: LeftIcon, rightSlot, invalid = false, className, ...rest },
  ref,
) {
  const padLeft = LeftIcon ? "pl-10" : "pl-4";
  const padRight = rightSlot ? "pr-10" : "pr-4";
  const borderColor = invalid ? "border-rose" : "border-border";

  return (
    <div className="relative">
      {LeftIcon ? (
        <LeftIcon
          size={16}
          strokeWidth={1.75}
          className="text-ink-faint pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
          aria-hidden="true"
        />
      ) : null}
      <input
        ref={ref}
        className={[
          "bg-bg-soft text-ink tracking-body w-full rounded-[12px] border font-sans text-[14px] font-medium",
          "py-[13px]",
          padLeft,
          padRight,
          borderColor,
          "focus:border-accent transition-[border-color,background] duration-200",
          "placeholder:text-ink-faint",
          className ?? "",
        ].join(" ")}
        aria-invalid={invalid || undefined}
        {...rest}
      />
      {rightSlot ? (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>
      ) : null}
    </div>
  );
});

export default Input;
