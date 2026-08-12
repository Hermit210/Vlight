"use client";

import { Sparkles } from "lucide-react";
import { useCreditsStore } from "@/store/credits-store";

export function CreditBadge() {
  const creditsRemaining = useCreditsStore((s) => s.creditsRemaining);

  return (
    <div className="pointer-events-none flex items-center gap-1 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[11px] font-medium text-zinc-200 backdrop-blur-md">
      <Sparkles size={12} className="text-violet-300" />
      {creditsRemaining}
    </div>
  );
}
