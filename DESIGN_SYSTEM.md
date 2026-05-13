# Attuna — Design System

The single source of truth for color, type, spacing, and motion tokens. Components consume CSS variables defined in `apps/web/app/globals.css`; this document explains what each token means and when to reach for it. Changing any token here requires founder approval per `CLAUDE.md`.

Status legend:

- **DECIDED** — locked, change requires explicit approval
- **PROPOSED** — Claude's recommendation, awaiting founder sign-off

---

## 1. Brand direction

**Buttermilk + mid blue, split by surface.** Warm cream backgrounds with a calm, trustworthy blue as the primary action color. The pairing is chosen to embody the product values from `CLAUDE.md`:

- **Calm** — warm low-saturation surfaces, generous whitespace, slow motion
- **Restraint** — one accent color does the work; no rainbow status palette
- **Privacy** — no flashy gradients or attention-grabbing patterns; the UI recedes so the clinical content can lead

The buttermilk is loudest where it can be a brand moment (marketing routes) and quietest where the user lives (the portal). Both surfaces share the same blue accent, ink, and status colors — only `--bg`, `--surface`, and `--border` shift between them. See `Section 2 — Surface modes` below.

Mid blue is the action. Status colors (success, warning, danger) are desaturated to harmonize with the cream rather than fight it.

---

## 2. Color tokens — DECIDED

All colors are exposed as CSS variables on `:root` (light) and `[data-theme="dark"]` (dark). Tailwind maps them via `tailwind.config.ts` so utilities like `bg-surface`, `text-ink`, `border-border`, `text-accent` resolve to the current theme automatically.

### Surface modes (light)

The portal-calm tokens are the `:root` default. The marketing surface opts in via a `data-surface="marketing"` wrapper in `app/(marketing)/layout.tsx`, which overrides only the surface/border tokens — everything else (ink, accent, status) is shared.

| Token            | Portal (default) | Marketing | Role                            |
| ---------------- | ---------------- | --------- | ------------------------------- |
| `--bg`           | `#F8F7F2`        | `#FAFAF7` | Page background                 |
| `--bg-soft`      | `#F1EFE7`        | `#F1F1EE` | Section dividers, sidebars      |
| `--surface`      | `#FFFFFF`        | `#FFFFFF` | Raised surfaces — cards, modals |
| `--surface-warm` | `#F1EFE7`        | `#F1F1EE` | Hover/secondary surface         |
| `--surface-deep` | `#E6E3D7`        | `#E6E6E2` | Pressed state, active row       |
| `--border`       | `#DDD9CA`        | `#E0E0DB` | Default border (cards, inputs)  |
| `--border-soft`  | `#E8E5D6`        | `#EBEBE6` | Quieter divider                 |

**Cosmetic touch — hero wash.** The marketing surface paints a soft radial gradient at the top (blue accent ~8% opacity, amber ~6% opacity) to give the hero a calm focal point without competing with the headline. Defined as `[data-surface="marketing"]::before` in `globals.css`.

### Shared light tokens (both surfaces)

| Token             | Hex       | Role                                                                 |
| ----------------- | --------- | -------------------------------------------------------------------- |
| `--ink`           | `#2A3441` | Primary body text — softened from near-black so headings don't punch |
| `--ink-soft`      | `#4A5462` | Secondary text                                                       |
| `--ink-mute`      | `#6E7682` | Muted labels, metadata                                               |
| `--ink-faint`     | `#A8ACB3` | Placeholders, disabled                                               |
| `--accent`        | `#276AB2` | **Primary — button fills, links, focus rings**                       |
| `--accent-bg`     | `#E6EDF6` | Accent-tinted background (badges, selected rows)                     |
| `--accent-deep`   | `#1F5894` | Hover / pressed state for primary                                    |
| `--sage`          | `#3D8B5A` | Success, confirmation                                                |
| `--warm`          | `#C8924D` | Warning, secondary highlight (amber/honey)                           |
| `--warm-bg`       | `#F5E5C5` | Warning-tinted background                                            |
| `--rose`          | `#B23B3B` | Danger, destructive action — use sparingly                           |
| `--ink-on-accent` | `#FFFFFF` | Text on `--accent` fills                                             |

### Dark mode

Dark mode is **warm charcoal**, not navy — the buttermilk story translates into a warm-toned dark surface so the blue stays the unambiguous hero color.

| Token             | Hex       | Role                                                   |
| ----------------- | --------- | ------------------------------------------------------ |
| `--bg`            | `#1A1814` | Page background (warm charcoal)                        |
| `--bg-soft`       | `#211E18` | Section dividers                                       |
| `--surface`       | `#26221C` | Raised surfaces                                        |
| `--surface-warm`  | `#2E2920` | Hover surface                                          |
| `--surface-deep`  | `#38322A` | Pressed / active                                       |
| `--border`        | `#3A3329` | Default border                                         |
| `--border-soft`   | `#2E2920` | Quieter divider                                        |
| `--ink`           | `#F0E6D2` | Body text (desaturated buttermilk)                     |
| `--ink-soft`      | `#D4CAB6` | Secondary text                                         |
| `--ink-mute`      | `#9B9482` | Muted labels                                           |
| `--ink-faint`     | `#6B6555` | Placeholders, disabled                                 |
| `--accent`        | `#276AB2` | Primary — same hex; white text still passes AA (5.5:1) |
| `--accent-bg`     | `#1E2A3C` | Accent-tinted dark background                          |
| `--accent-deep`   | `#3A7EC5` | Hover lifts (lighter in dark mode, by convention)      |
| `--sage`          | `#5FA678` | Success                                                |
| `--warm`          | `#DBA968` | Warning                                                |
| `--warm-bg`       | `#2A2418` | Warning tint                                           |
| `--rose`          | `#D46A6A` | Danger                                                 |
| `--ink-on-accent` | `#FFFFFF` | Text on accent                                         |

### Contrast budget

Every committed combination must meet **WCAG AA** — 4.5:1 for normal text, 3:1 for large text and UI components. Verified pairings:

- `--ink` on `--bg` light: ~14:1 ✓
- `--ink-on-accent` on `--accent` (both modes): ~5.5:1 ✓
- `--accent` on `--bg` light: ~4.3:1 ✓ (large text / UI components only)
- `--ink` on `--bg` dark: ~13:1 ✓

If you introduce a new color combination, check it (e.g. webaim.org/resources/contrastchecker/). Don't ship a combination you haven't verified.

---

## 3. Theme switching — DECIDED

- Theme is stored in `localStorage` under key `theme` (`"light"` | `"dark"`).
- First visit honors `prefers-color-scheme`.
- An inline script in `apps/web/lib/theme-script.ts` runs before paint to set `data-theme` on `<html>`, preventing flash of unstyled content.
- `useTheme()` (`apps/web/lib/use-theme.ts`) is the only way client code should read/write theme — do not touch `document.documentElement` directly.

Every screen must work in both modes. PR description should mention "verified in light + dark" when shipping UI.

---

## 4. Typography — PROPOSED

Fonts are loaded via `next/font` and exposed as `--font-sans` and `--font-display`. Specific font choices are deferred until brand identity work; current placeholders should remain swappable.

- **Body / UI** — `var(--font-sans)`, fallback `system-ui`, `-apple-system`, `sans-serif`
- **Display** — `var(--font-display)`, fallback `Georgia`, `serif` (intent: serif headings for warmth; subject to change)

Helper classes in `globals.css`:

- `.display` — heaviest, 600 weight, tight tracking; page titles, hero
- `.display-md` — 500 weight, medium tracking; section headings
- `.display-text` — 400 weight; quotes, narrative copy

Body letter-spacing is `-0.005em`; display headings tighten further (`-0.015em` to `-0.025em`) to read as intentional rather than default.

---

## 5. Motion — DECIDED

- Default easing: `cubic-bezier(0.16, 1, 0.3, 1)` (slow-in fast-out, calm). Tailwind alias: `ease-attuna`.
- Default duration scale: 250ms (hover), 600ms (fade-in), 900ms (fade-up), 2500ms (decorative).
- No bouncy easings, no spring overshoot. We are not a fintech app.
- Respect `prefers-reduced-motion`: any animation lasting > 400ms must be skipped or shortened. (TODO: add a global rule once the first complaint arrives.)

Reusable animations live in `tailwind.config.ts` and `globals.css`:
`fade-up`, `fade-in`, `float`, `pulse-soft`, `draw-path`, `grow-bar`, `marquee`, `streamCursor`, `voiceBar`.

---

## 6. Component primitives — PROPOSED

These are conventions, not yet enforced by a component library.

- **Buttons** — primary uses `bg-accent text-ink-on-accent`; secondary uses `bg-surface border border-border text-ink`; destructive uses `text-rose` or `bg-rose text-white` for confirmed actions only.
- **Cards** — `bg-surface border border-border rounded-2xl`; hover lift via `.card-warm` class (4px translate, accent border).
- **Inputs** — `bg-surface border border-border` with `--accent` focus ring; placeholders use `--ink-faint`.
- **Badges / pills** — `bg-accent-bg text-accent` for neutral info; `bg-warm-bg text-warm` for warnings; `bg-[var(--sage,#3D8B5A)]/10 text-sage` for success.

---

## 7. What this document is not

- Not a component library spec — components live in `packages/ui` and `apps/web` and are documented inline.
- Not a brand guidelines doc — logo, voice, illustration style are out of scope until a designer engages.
- Not a Figma source of truth — once Figma exists, link it here; until then, the CSS variables are canonical.
