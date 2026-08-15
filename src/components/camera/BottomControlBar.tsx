"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useCaptureStore } from "@/store/capture-store";

const MODES = ["Photo", "Video", "Portrait", "Night"] as const;
type Mode = (typeof MODES)[number];

interface BottomControlBarProps {
  onFlipCamera: () => void;
  onOpenPublish: () => void;
  /** true in fallback-room mode, where there's no live camera to flip. */
  flipDisabled?: boolean;
}

export function BottomControlBar({ onFlipCamera, onOpenPublish, flipDisabled }: BottomControlBarProps) {
  const [mode, setMode] = useState<Mode>("Photo");
  const lastCaptureUrl = useCaptureStore((s) => s.lastCaptureUrl);
  const capture = useCaptureStore((s) => s.capture);

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center gap-4 text-xs">
        {MODES.map((m) => {
          const active = m === mode;
          const functional = m === "Photo";
          return (
            <button
              key={m}
              disabled={!functional}
              onClick={() => functional && setMode(m)}
              className={`font-medium tracking-wide transition-colors ${
                active ? "text-white" : "text-zinc-500"
              } ${functional ? "" : "opacity-40"}`}
            >
              {m.toUpperCase()}
            </button>
          );
        })}
      </div>

      <div className="flex w-full items-center justify-between px-8">
        <button
          onClick={onOpenPublish}
          disabled={!lastCaptureUrl}
          aria-label="Save as Pack"
          className="h-11 w-11 overflow-hidden rounded-lg border border-white/20 bg-white/5 disabled:opacity-40"
        >
          {lastCaptureUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lastCaptureUrl} alt="Last capture" className="h-full w-full object-cover" />
          )}
        </button>

        <button
          onClick={capture}
          aria-label="Capture"
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 active:scale-95"
        >
          <span className="rounded-full bg-white" style={{ height: "3.25rem", width: "3.25rem" }} />
        </button>

        <button
          onClick={onFlipCamera}
          disabled={flipDisabled}
          aria-label="Flip camera"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md active:scale-95 disabled:opacity-30"
        >
          <RefreshCw size={18} />
        </button>
      </div>
    </div>
  );
}
