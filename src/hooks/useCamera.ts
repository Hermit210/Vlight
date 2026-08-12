"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "pending" | "granted" | "denied" | "error";

// Wraps getUserMedia + a hidden <video> element that plays the live feed.
// The video element itself is the source handed to THREE.VideoTexture —
// this hook owns permission/stream lifecycle only, no rendering.
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const requestCamera = useCallback(
    async (mode: "user" | "environment" = facingMode) => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setError("Camera access isn't supported in this browser.");
        return;
      }
      setStatus("pending");
      setError(null);
      stopStream();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setFacingMode(mode);
        setStatus("granted");
      } catch (err) {
        setStatus(err instanceof DOMException && err.name === "NotAllowedError" ? "denied" : "error");
        setError(err instanceof Error ? err.message : "Could not access camera.");
      }
    },
    [facingMode, stopStream]
  );

  const switchCamera = useCallback(() => {
    requestCamera(facingMode === "user" ? "environment" : "user");
  }, [facingMode, requestCamera]);

  useEffect(() => stopStream, [stopStream]);

  return { videoRef, status, error, facingMode, requestCamera, switchCamera, stopStream };
}
