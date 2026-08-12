"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useOverlayStore } from "@/store/overlay-store";
import { useCreditsStore } from "@/store/credits-store";

// The pill input that generates an overlay from text (spec §2). Generation
// itself lands with /api/generate-overlay (task 22) — for now this captures
// the prompt and shows a clear "not wired yet" state instead of pretending
// to call an API that doesn't exist.
export function PromptBar() {
  const [expanded, setExpanded] = useState(false);
  const activePrompt = useOverlayStore((s) => s.activePrompt);
  const setActivePrompt = useOverlayStore((s) => s.setActivePrompt);
  const creditsRemaining = useCreditsStore((s) => s.creditsRemaining);
  const [draft, setDraft] = useState(activePrompt);

  const submit = () => {
    setActivePrompt(draft.trim());
    setExpanded(false);
  };

  return (
    <div className="pointer-events-auto absolute inset-x-4 z-20" style={{ bottom: "calc(6.5rem + env(safe-area-inset-bottom))" }}>
      {expanded ? (
        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-3 py-2 backdrop-blur-md">
          <Sparkles size={16} className="shrink-0 text-violet-300" />
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="moody purple teal glow, soft glitter…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={creditsRemaining <= 0 || draft.trim().length === 0}
            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-black disabled:opacity-30"
          >
            Generate
          </button>
          <button onClick={() => setExpanded(false)} aria-label="Collapse">
            <ChevronDown size={16} className="text-zinc-400" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="flex w-full items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-2.5 text-left backdrop-blur-md"
        >
          <Sparkles size={16} className="shrink-0 text-violet-300" />
          <span className="flex-1 truncate text-sm text-zinc-200">
            {activePrompt || "Describe a vibe…"}
          </span>
          <ChevronUp size={16} className="shrink-0 text-zinc-400" />
        </button>
      )}
    </div>
  );
}
