"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { X } from "lucide-react";
import { useOverlayStore } from "@/store/overlay-store";
import { useCaptureStore } from "@/store/capture-store";

interface PublishSheetProps {
  onClose: () => void;
}

// Bottom sheet for turning the current overlay config into a Pack. Wallet
// connect works today against devnet; actual mint_pack submission is wired
// once the Anchor program (register_creator/mint_pack/list_pack/buy_pack)
// is deployed — until then the mint button stays disabled with that noted.
export function PublishSheet({ onClose }: PublishSheetProps) {
  const { connected, publicKey } = useWallet();
  const activePrompt = useOverlayStore((s) => s.activePrompt);
  const lastCaptureUrl = useCaptureStore((s) => s.lastCaptureUrl);
  const [name, setName] = useState(activePrompt || "Untitled vibe");
  const [price, setPrice] = useState("0.1");

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-end bg-black/60" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-2xl border-t border-white/10 bg-zinc-950 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Save as Pack</h2>
          <button onClick={onClose} aria-label="Close">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        {lastCaptureUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lastCaptureUrl}
            alt="Captured preview"
            className="mb-3 h-32 w-full rounded-lg object-cover"
          />
        )}

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            <span>Price (SOL)</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              className="rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
            />
          </label>

          {!connected ? (
            <WalletMultiButton style={{ width: "100%", justifyContent: "center" }} />
          ) : (
            <p className="truncate text-[11px] text-zinc-500">
              Connected: {publicKey?.toBase58()}
            </p>
          )}

          <button
            disabled
            title="Ships once the Anchor mint_pack program is deployed to devnet"
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black opacity-30"
          >
            Mint Pack
          </button>
          <p className="text-center text-[10px] text-zinc-600">
            On-chain minting isn&apos;t live yet — connect your wallet to preview the flow.
          </p>
        </div>
      </div>
    </div>
  );
}
