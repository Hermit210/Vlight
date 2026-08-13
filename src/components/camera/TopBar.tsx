"use client";

import { Grid3x3, Settings, Share2, X, Zap, ZapOff } from "lucide-react";
import { CreditBadge } from "./CreditBadge";

interface TopBarProps {
  onToggleSettings: () => void;
  onClose: () => void;
  onShare: () => void;
  onOpenGallery: () => void;
  flashOn: boolean;
  onToggleFlash: () => void;
}

export function TopBar({
  onToggleSettings,
  onClose,
  onShare,
  onOpenGallery,
  flashOn,
  onToggleFlash,
}: TopBarProps) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSettings}
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md active:scale-95"
        >
          <Settings size={18} />
        </button>
        <button
          onClick={onOpenGallery}
          aria-label="Gallery"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md active:scale-95"
        >
          <Grid3x3 size={18} />
        </button>
      </div>

      <button
        onClick={onToggleFlash}
        aria-label="Toggle flash"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md active:scale-95"
      >
        {flashOn ? <Zap size={18} /> : <ZapOff size={18} />}
      </button>

      <div className="flex items-center gap-2">
        <CreditBadge />
        <button
          onClick={onShare}
          aria-label="Share"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md active:scale-95"
        >
          <Share2 size={18} />
        </button>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md active:scale-95"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
