"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Camera, X } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { useOverlayStore } from "@/store/overlay-store";
import { CameraStage } from "./CameraStage";
import { ControlsPanel } from "./ControlsPanel";
import { TopBar } from "./TopBar";
import { PromptBar } from "./PromptBar";
import { BottomControlBar } from "./BottomControlBar";
import { ShareSheet } from "./ShareSheet";
import { GalleryModal } from "@/components/marketplace/GalleryModal";

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
  const [showGallery, setShowGallery] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Camera is opt-in, not required — the app is fully usable on the
  // FallbackRoom background from the moment it loads (spec §0, locked
  // requirement). Requesting on mount just gives the fast path a chance
  // to skip the extra tap when the browser can resolve it instantly.
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

  const useVideo = status === "granted";
  const showCameraBanner = !useVideo && !bannerDismissed;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <CameraStage videoRef={videoRef} useVideo={useVideo} />

      <TopBar
        onToggleSettings={() => setShowSettings((v) => !v)}
        onClose={closeCamera}
        onShare={() => setShowShare(true)}
        onOpenGallery={() => setShowGallery(true)}
        flashOn={flashOn}
        onToggleFlash={() => setFlashOn((v) => !v)}
      />
      {showSettings && <ControlsPanel />}
      {showGallery && <GalleryModal onClose={() => setShowGallery(false)} />}
      {loadError && (
        <div className="pointer-events-none absolute inset-x-4 top-16 z-20 rounded-lg bg-black/70 px-3 py-2 text-center text-xs text-red-300">
          {loadError}
        </div>
      )}

      {showCameraBanner && (
        <div className="pointer-events-auto absolute inset-x-4 top-16 z-20 flex items-center gap-2 rounded-xl border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-md">
          <Camera size={16} className="shrink-0 text-zinc-300" />
          <p className="flex-1 text-xs text-zinc-300">
            {status === "pending"
              ? "Requesting camera access…"
              : status === "denied"
                ? "Camera denied — you're in the illustrated room. Allow it in browser settings to switch to your real camera."
                : "No camera yet — you're in the illustrated room. The vibe still applies live."}
          </p>
          {status !== "pending" && (
            <button
              onClick={() => requestCamera()}
              className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-black"
            >
              Enable camera
            </button>
          )}
          <button onClick={() => setBannerDismissed(true)} aria-label="Dismiss" className="shrink-0 text-zinc-400">
            <X size={14} />
          </button>
        </div>
      )}

      <PromptBar />
      <BottomControlBar
        onFlipCamera={switchCamera}
        onOpenPublish={() => setShowPublish(true)}
        flipDisabled={!useVideo}
      />
      {showPublish && <PublishModal onClose={() => setShowPublish(false)} />}
      {showShare && <ShareSheet onClose={() => setShowShare(false)} />}
    </div>
  );
}
