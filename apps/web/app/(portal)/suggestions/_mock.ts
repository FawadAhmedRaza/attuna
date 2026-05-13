// Phase 2 mock. Phase 8 wires this to the `suggestions` table per
// ARCHITECTURE.md (therapist-authored prompts that show up in the client app).

export type Suggestion = {
  id: string;
  title: string;
  body: string;
  uses: number;
};

export const SUGGESTIONS: Suggestion[] = [
  {
    id: "heavy-day",
    title: "When the day felt heavy",
    body: "What was hardest to set down today? You don't need to solve it — just describe what was there.",
    uses: 47,
  },
  {
    id: "after-argument",
    title: "After an argument",
    body: "If it would help, write what you wished you had said. No one will read it but you and me.",
    uses: 23,
  },
  {
    id: "sunday-evening",
    title: "On Sunday evenings",
    body: "Sundays carry weight for many of us. What about tomorrow feels heaviest right now?",
    uses: 18,
  },
  {
    id: "sleep-wont-come",
    title: "When sleep won't come",
    body: "Sometimes the body holds what the mind can't. Where do you notice yourself most tonight?",
    uses: 31,
  },
];
