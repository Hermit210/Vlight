"use client";

import { RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { VideoPlane } from "./VideoPlane";
import { FallbackRoom } from "./FallbackRoom";
import { GlowLayers } from "./GlowLayers";
import { ParticlesLayer } from "./ParticlesLayer";
import { PostFX } from "./PostFX";
import { useCaptureStore } from "@/store/capture-store";

interface CameraStageProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** true once getUserMedia has actually granted a live stream. */
  useVideo: boolean;
}

// Full-bleed background layer of the R3F scene — either the live camera
// feed (VideoPlane) or the illustrated FallbackRoom when camera access is
// denied/unavailable/skipped (spec §0/§3, locked requirement: the overlay
// experience must work in both cases). The Canvas always mounts; only the
// background source swaps. GlowLayers/ParticlesLayer/PostFX are identical
// either way — that shared code path is the point.
export function CameraStage({ videoRef, useVideo }: CameraStageProps) {
  const setCanvasEl = useCaptureStore((s) => s.setCanvasEl);

  return (
    <>
      <video ref={videoRef} playsInline muted className="hidden" />
      <Canvas
        className="!absolute inset-0"
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onCreated={(state) => setCanvasEl(state.gl.domElement)}
      >
        {useVideo ? <VideoPlane videoRef={videoRef} /> : <FallbackRoom />}
        <GlowLayers />
        <ParticlesLayer />
        <PostFX />
      </Canvas>
    </>
  );
}
