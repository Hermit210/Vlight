import { create } from "zustand";

// Local-only placeholder until /api/generate-overlay + Supabase
// prompt_credits land (spec §4/§5) — 3 free generations, mirrors the
// server-side default so the UI reads correctly before the backend exists.
interface CreditsState {
  creditsRemaining: number;
  decrement: () => void;
}

export const useCreditsStore = create<CreditsState>((set) => ({
  creditsRemaining: 3,
  decrement: () => set((s) => ({ creditsRemaining: Math.max(0, s.creditsRemaining - 1) })),
}));
