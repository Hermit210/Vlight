"use client";

import { useEffect, useState } from "react";
import { useCamera } from "@/hooks/useCamera";
import { CameraStage } from "@/components/camera/CameraStage";
import { ControlsPanel } from "@/components/camera/ControlsPanel";
import { TopBar } from "@/components/camera/TopBar";
import { PromptBar } from "@/components/camera/PromptBar";
import { BottomControlBar } from "@/components/camera/BottomControlBar";

export default function Home() {
  const { videoRef, status, error, requestCamera, switchCamera, closeCamera } = useCamera();
  const [showSettings, setShowSettings] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    requestCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <CameraStage videoRef={videoRef} active={status === "granted"} />

      {status === "granted" && (
        <>
          <TopBar
            onToggleSettings={() => setShowSettings((v) => !v)}
            onClose={closeCamera}
            flashOn={flashOn}
            onToggleFlash={() => setFlashOn((v) => !v)}
          />
          {showSettings && <ControlsPanel />}
          <PromptBar />
          <BottomControlBar onFlipCamera={switchCamera} />
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
