"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useCamera } from "@/hooks/useCamera";
import { useOverlayStore } from "@/store/overlay-store";
import { CameraStage } from "./CameraStage";
import { ControlsPanel } from "./ControlsPanel";
import { TopBar } from "./TopBar";
import { PromptBar } from "./PromptBar";
import { BottomControlBar } from "./BottomControlBar";
import { ShareSheet } from "./ShareSheet";

// Wallet adapter + UI only loads when Publish is opened — never in the
// initial bundle, per spec §7.
const PublishModal = dynamic(() => import("@/components/wallet/PublishModal"), { ssr: false });

interface CameraAppProps {
  /** When set, loads a shared session's config into the live camera view (spec §0 shareable link / remix). */
  sessionId?: string;
}

export function CameraApp({ sessionId }: CameraAppProps) {
  const { videoRef, status, error, requestCamera, switchCamera, closeCamera } = useCamera();
  const applyGeneratedConfig = useOverlayStore((s) => s.applyGeneratedConfig);
  const [showSettings, setShowSettings] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    requestCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}`);
        if (!res.ok) throw new Error();
        const { overlay_config } = await res.json();
        if (!cancelled) applyGeneratedConfig(overlay_config);
      } catch {
        if (!cancelled) setLoadError("Couldn't load that shared vibe — it may have expired.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, applyGeneratedConfig]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <CameraStage videoRef={videoRef} active={status === "granted"} />

      {status === "granted" && (
        <>
          <TopBar
            onToggleSettings={() => setShowSettings((v) => !v)}
            onClose={closeCamera}
            onShare={() => setShowShare(true)}
            flashOn={flashOn}
            onToggleFlash={() => setFlashOn((v) => !v)}
          />
          {showSettings && <ControlsPanel />}
          {loadError && (
            <div className="pointer-events-none absolute inset-x-4 top-16 z-20 rounded-lg bg-black/70 px-3 py-2 text-center text-xs text-red-300">
              {loadError}
            </div>
          )}
          <PromptBar />
          <BottomControlBar onFlipCamera={switchCamera} onOpenPublish={() => setShowPublish(true)} />
          {showPublish && <PublishModal onClose={() => setShowPublish(false)} />}
          {showShare && <ShareSheet onClose={() => setShowShare(false)} />}
        </>
      )}

      {status !== "granted" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center text-white">
          {status === "pending" && <p className="text-sm text-zinc-400">Requesting camera access…</p>}
          {(status === "idle" || status === "denied" || status === "error") && (
            <>
              <p className="text-sm text-zinc-400">
                {status === "denied"
                  ? "Camera access was denied. Allow it in your browser settings, then retry."
                  : error ?? "Vlight needs your camera to preview the live overlay."}
              </p>
              <button
                onClick={() => requestCamera()}
                className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white hover:bg-white/20"
              >
                Enable camera
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
