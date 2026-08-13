import { create } from "zustand";

// Local-only placeholder until /api/generate-overlay + Supabase
// prompt_credits land (spec §4/§5) — 3 free generations, mirrors the
// server-side default so the UI reads correctly before the backend exists.
interface CreditsState {
  creditsRemaining: number;
  setCredits: (n: number) => void;
}

export const useCreditsStore = create<CreditsState>((set) => ({
  creditsRemaining: 3,
  setCredits: (creditsRemaining) => set({ creditsRemaining }),
}));
