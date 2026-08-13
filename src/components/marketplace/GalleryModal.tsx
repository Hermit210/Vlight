"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useOverlayStore } from "@/store/overlay-store";
import type { OverlayConfig } from "@/types/overlay";

interface Pack {
  mint: string;
  creator_wallet: string;
  name: string;
  price_lamports: number | null;
  royalty_bps: number | null;
  remix_of_mint: string | null;
  overlay_config: OverlayConfig;
  generated_via_prompt: boolean;
  source_prompt: string | null;
  thumbnail_url: string | null;
}

interface GalleryModalProps {
  onClose: () => void;
}

// Browse published Packs from asset_catalog and apply one straight to the
// live camera feed — the "apply this Pack to my live camera" flow (spec
// §0/§7). Buying on-chain ships once the Anchor program is deployed
// (see PublishSheet's Mint button for the same staged pattern).
export function GalleryModal({ onClose }: GalleryModalProps) {
  const [packs, setPacks] = useState<Pack[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const applyGeneratedConfig = useOverlayStore((s) => s.applyGeneratedConfig);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/packs");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load gallery");
        if (!cancelled) setPacks(data.packs);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load gallery");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = (pack: Pack) => {
    applyGeneratedConfig(pack.overlay_config, pack.source_prompt ?? pack.name);
    onClose();
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex flex-col bg-black/90 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <h2 className="text-sm font-semibold text-white">Gallery</h2>
        <button onClick={onClose} aria-label="Close">
          <X size={18} className="text-zinc-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <p className="text-center text-xs text-red-300">
            Couldn&apos;t load the gallery — Supabase isn&apos;t configured yet in this environment.
          </p>
        )}
        {!error && packs === null && (
          <p className="text-center text-xs text-zinc-500">Loading…</p>
        )}
        {!error && packs?.length === 0 && (
          <p className="text-center text-xs text-zinc-500">
            No published Packs yet — be the first to mint one.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {packs?.map((pack) => (
            <div
              key={pack.mint}
              className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
            >
              <div className="aspect-square w-full bg-white/5">
                {pack.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pack.thumbnail_url} alt={pack.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex flex-col gap-1.5 p-2.5">
                <p className="truncate text-xs font-medium text-white">{pack.name}</p>
                {pack.generated_via_prompt && (
                  <p className="flex items-center gap-1 truncate text-[10px] text-violet-300">
                    <Sparkles size={10} /> {pack.source_prompt}
                  </p>
                )}
                <p className="text-[10px] text-zinc-500">
                  {pack.price_lamports ? `${(pack.price_lamports / 1e9).toFixed(2)} SOL` : "Free"}
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => apply(pack)}
                    className="flex-1 rounded-full bg-white px-2 py-1 text-[11px] font-medium text-black"
                  >
                    Apply
                  </button>
                  <button
                    disabled
                    title="Ships once the Anchor buy_pack program is deployed to devnet"
                    className="flex-1 rounded-full border border-white/20 px-2 py-1 text-[11px] text-zinc-400 opacity-40"
                  >
                    Buy
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
