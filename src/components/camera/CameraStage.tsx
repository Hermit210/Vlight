"use client";

import { RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { VideoPlane } from "./VideoPlane";

interface CameraStageProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  active: boolean;
}

// Full-bleed live camera feed rendered as the base layer of the R3F scene.
// The <video> element is kept off-screen — it exists only as the source
// for VideoPlane's THREE.VideoTexture, per spec §3. Camera permission
// lifecycle lives in the parent (useCamera) so this stays render-only.
export function CameraStage({ videoRef, active }: CameraStageProps) {
  return (
    <>
      <video ref={videoRef} playsInline muted className="hidden" />
      {active && (
        <Canvas className="!absolute inset-0" gl={{ antialias: true }}>
          <VideoPlane videoRef={videoRef} />
        </Canvas>
      )}
    </>
  );
}
