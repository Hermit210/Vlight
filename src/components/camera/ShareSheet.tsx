"use client";

import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { useOverlayStore } from "@/store/overlay-store";
import { getGuestId } from "@/lib/guest-id";

interface ShareSheetProps {
  onClose: () => void;
}

export function ShareSheet({ onClose }: ShareSheetProps) {
  const config = useOverlayStore((s) => s.config);
  const [status, setStatus] = useState<"saving" | "ready" | "error">("saving");
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner_id: getGuestId(), overlay_config: config }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { id } = await res.json();
        if (!cancelled) {
          setUrl(`${window.location.origin}/s/${id}`);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-end bg-black/60" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-2xl border-t border-white/10 bg-zinc-950 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Share this vibe</h2>
          <button onClick={onClose} aria-label="Close">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        {status === "saving" && <p className="text-xs text-zinc-500">Saving…</p>}
        {status === "error" && (
          <p className="text-xs text-red-400">
            Couldn&apos;t save — Supabase isn&apos;t configured yet in this environment.
          </p>
        )}
        {status === "ready" && (
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <span className="flex-1 truncate text-xs text-zinc-300">{url}</span>
            <button
              onClick={copy}
              aria-label="Copy link"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
