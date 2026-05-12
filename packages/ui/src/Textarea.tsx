import { forwardRef, type TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid = false, className, ...rest },
  ref,
) {
  const borderColor = invalid ? "border-rose" : "border-border";
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={[
        "bg-bg-soft text-ink tracking-body w-full rounded-[12px] border px-4 py-3 font-sans text-[14px] font-medium",
        "focus:border-accent transition-[border-color,background] duration-200",
        "placeholder:text-ink-faint resize-y",
        borderColor,
        className ?? "",
      ].join(" ")}
      {...rest}
    />
  );
});

export default Textarea;
