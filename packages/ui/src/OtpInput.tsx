"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

type OtpInputProps = {
  name?: string;
  length?: number;
  autoFocus?: boolean;
  invalid?: boolean;
  onComplete?: (code: string) => void;
};

const ONLY_DIGITS = /^\d+$/;

export function OtpInput({
  name = "code",
  length = 6,
  autoFocus = true,
  invalid = false,
  onComplete,
}: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length }, () => ""));
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const code = digits.join("");

  useEffect(() => {
    if (code.length === length && onComplete) onComplete(code);
  }, [code, length, onComplete]);

  function setDigitAt(i: number, ch: string) {
    setDigits((prev) => {
      const next = [...prev];
      next[i] = ch;
      return next;
    });
  }

  function handleChange(i: number, raw: string) {
    // Accept only digits; if multiple chars pasted, distribute them.
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      setDigitAt(i, "");
      return;
    }
    if (cleaned.length === 1) {
      setDigitAt(i, cleaned);
      if (i < length - 1) refs.current[i + 1]?.focus();
      return;
    }
    // Multi-char drop (typing fast or autofill)
    setDigits((prev) => {
      const next = [...prev];
      for (let k = 0; k < cleaned.length && i + k < length; k++) {
        next[i + k] = cleaned[k]!;
      }
      return next;
    });
    const nextIdx = Math.min(i + cleaned.length, length - 1);
    refs.current[nextIdx]?.focus();
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[i]) {
        setDigitAt(i, "");
      } else if (i > 0) {
        refs.current[i - 1]?.focus();
        setDigitAt(i - 1, "");
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      refs.current[i + 1]?.focus();
      e.preventDefault();
    }
  }

  function handlePaste(i: number, e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    setDigits((prev) => {
      const next = [...prev];
      for (let k = 0; k < text.length && i + k < length; k++) next[i + k] = text[k]!;
      return next;
    });
    const nextIdx = Math.min(i + text.length, length - 1);
    refs.current[nextIdx]?.focus();
  }

  const borderColor = invalid ? "border-rose" : "border-border";

  return (
    <>
      <input type="hidden" name={name} value={code} />
      <div className="flex justify-between gap-2" role="group" aria-label="One-time code">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={(e) => handlePaste(i, e)}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            aria-label={`Digit ${i + 1}`}
            aria-invalid={invalid || undefined}
            className={[
              "display bg-bg-soft text-ink h-14 w-12 rounded-[12px] border text-center text-[24px] font-medium",
              "focus:border-accent transition-colors",
              borderColor,
            ].join(" ")}
            style={{ letterSpacing: "-0.01em" }}
          />
        ))}
      </div>
    </>
  );
}

export default OtpInput;
