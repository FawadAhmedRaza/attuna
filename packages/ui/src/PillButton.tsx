import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

type PillButtonProps = {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

const sizeClasses: Record<Size, string> = {
  sm: "px-[18px] py-[9px] text-[13px]",
  md: "px-[22px] py-[13px] text-[14px]",
  lg: "px-[28px] py-[14px] text-[14px]",
};

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-ink-on-accent border border-transparent font-semibold pill-btn",
  outline: "bg-surface text-ink border border-border font-medium pill-btn",
  ghost: "bg-transparent text-ink-soft border border-border font-medium hover:text-ink",
};

export function PillButton({
  variant = "primary",
  size = "md",
  children,
  type = "button",
  ...rest
}: PillButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-full",
        "tracking-body cursor-pointer font-sans",
        "ease-attuna transition-all duration-200",
        sizeClasses[size],
        variantClasses[variant],
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}

export default PillButton;
