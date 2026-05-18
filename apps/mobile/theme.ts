// Calm-palette tokens for the mobile app. Values mirror the
// `--bg`/`--ink`/`--accent` family in apps/web/app/globals.css so the
// two surfaces feel like the same product. When DESIGN_SYSTEM.md
// hardens, regenerate from there rather than editing here.
//
// `useColors()` returns the right palette for the current
// `userInterfaceStyle` (automatic, light, or dark).

import { useColorScheme } from "react-native";

export type Palette = {
  bg: string;
  bgSoft: string;
  surface: string;
  surfaceDeep: string;
  border: string;
  borderSoft: string;
  ink: string;
  inkSoft: string;
  inkMute: string;
  inkFaint: string;
  inkOnAccent: string;
  accent: string;
  accentBg: string;
  accentDeep: string;
  warm: string;
  rose: string;
  sage: string;
};

const light: Palette = {
  bg: "#F8F7F2",
  bgSoft: "#F2F1EB",
  surface: "#FFFFFF",
  surfaceDeep: "#EBEAE3",
  border: "#E2DFD5",
  borderSoft: "#EEEBE2",
  ink: "#1A1814",
  inkSoft: "#42403A",
  inkMute: "#6B695F",
  inkFaint: "#9B9A91",
  inkOnAccent: "#FFFFFF",
  accent: "#2F6F5E",
  accentBg: "#E7F0EC",
  accentDeep: "#1F4F44",
  warm: "#B97A56",
  rose: "#A04B5C",
  sage: "#6F8A6C",
};

const dark: Palette = {
  bg: "#1A1814",
  bgSoft: "#211F1A",
  surface: "#262420",
  surfaceDeep: "#181613",
  border: "#3A3833",
  borderSoft: "#2E2C28",
  ink: "#F2EFE7",
  inkSoft: "#C7C3B8",
  inkMute: "#8E8A80",
  inkFaint: "#5F5C55",
  inkOnAccent: "#FFFFFF",
  accent: "#7FB39E",
  accentBg: "#1F3A33",
  accentDeep: "#5F8E7D",
  warm: "#D49A77",
  rose: "#C7708A",
  sage: "#9CB59A",
};

export function useColors(): Palette {
  const scheme = useColorScheme();
  return scheme === "dark" ? dark : light;
}

// Type scale picks a single sans family (system default in M2.3b.2;
// Plus Jakarta Sans gets bundled when we ship icons + custom fonts in
// the EAS Build slice). Sizes match the web app's hierarchy at one
// less step — phones don't need the same display ladder as a sidebar
// layout.
export const type = {
  display: { size: 30, weight: "500" as const, letterSpacing: -0.4 },
  title: { size: 22, weight: "600" as const, letterSpacing: -0.25 },
  bodyLg: { size: 16, weight: "400" as const, letterSpacing: -0.1 },
  body: { size: 14, weight: "400" as const, letterSpacing: -0.05 },
  caption: { size: 12, weight: "500" as const, letterSpacing: 0 },
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};
