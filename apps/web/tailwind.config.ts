import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-soft": "var(--bg-soft)",
        surface: "var(--surface)",
        "surface-warm": "var(--surface-warm)",
        "surface-deep": "var(--surface-deep)",
        border: "var(--border)",
        "border-soft": "var(--border-soft)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        "ink-mute": "var(--ink-mute)",
        "ink-faint": "var(--ink-faint)",
        accent: "var(--accent)",
        "accent-bg": "var(--accent-bg)",
        "accent-deep": "var(--accent-deep)",
        sage: "var(--sage)",
        warm: "var(--warm)",
        "warm-bg": "var(--warm-bg)",
        rose: "var(--rose)",
        "ink-on-accent": "var(--ink-on-accent)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
      },
      letterSpacing: {
        body: "-0.005em",
        "display-md": "-0.015em",
        "display-lg": "-0.025em",
      },
      transitionTimingFunction: {
        attuna: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(1.5)" },
        },
        drawPath: {
          from: { strokeDashoffset: "1000" },
          to: { strokeDashoffset: "0" },
        },
        growBar: {
          from: { width: "0" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in": "fadeIn 0.6s ease-out forwards",
        float: "float 5s ease-in-out infinite",
        "pulse-soft": "pulseSoft 2.5s ease-in-out infinite",
        "draw-path": "drawPath 2.5s ease-out forwards",
        "grow-bar": "growBar 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        marquee: "marquee 50s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
