"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";
import { useOverlayStore } from "@/store/overlay-store";
import { useCreditsStore } from "@/store/credits-store";
import { getGuestId } from "@/lib/guest-id";

// The pill input that generates an overlay from text (spec §2/§5).
export function PromptBar() {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const activePrompt = useOverlayStore((s) => s.activePrompt);
  const applyGeneratedConfig = useOverlayStore((s) => s.applyGeneratedConfig);
  const creditsRemaining = useCreditsStore((s) => s.creditsRemaining);
  const setCredits = useCreditsStore((s) => s.setCredits);
  const [draft, setDraft] = useState(activePrompt);

  const submit = async () => {
    const prompt = draft.trim();
    if (!prompt || creditsRemaining <= 0 || status === "loading") return;
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/generate-overlay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, user_id: getGuestId() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      applyGeneratedConfig(data.config, prompt);
      setCredits(data.credits_remaining);
      setStatus("idle");
      setExpanded(false);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Generation failed");
    }
  };

  return (
    <div className="pointer-events-auto absolute inset-x-4 z-20" style={{ bottom: "calc(6.5rem + env(safe-area-inset-bottom))" }}>
      {expanded ? (
        <div className="flex flex-col gap-1.5">
          {error && (
            <p className="rounded-lg bg-black/70 px-3 py-1.5 text-center text-[11px] text-red-300">{error}</p>
          )}
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-3 py-2 backdrop-blur-md">
            <Sparkles size={16} className="shrink-0 text-violet-300" />
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="moody purple teal glow, soft glitter…"
              disabled={status === "loading"}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={submit}
              disabled={creditsRemaining <= 0 || draft.trim().length === 0 || status === "loading"}
              className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-black disabled:opacity-30"
            >
              {status === "loading" && <Loader2 size={12} className="animate-spin" />}
              Generate
            </button>
            <button onClick={() => setExpanded(false)} aria-label="Collapse">
              <ChevronDown size={16} className="text-zinc-400" />
            </button>
          </div>
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
