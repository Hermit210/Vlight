"use client";

import { useEffect } from "react";
import { useCamera } from "@/hooks/useCamera";

export default function Home() {
  const { videoRef, status, error, requestCamera } = useCamera();

  useEffect(() => {
    requestCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        className="h-full w-full object-cover"
        style={{ display: status === "granted" ? "block" : "none" }}
      />

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
