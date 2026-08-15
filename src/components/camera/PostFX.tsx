"use client";

import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { ColorGradeEffect } from "./ColorGradeEffect";

// Bloom turns the flat glow sprites into "neon glow" / "warm pools of
// light" (spec §3). ColorGradeEffect runs after it so tint/saturation/
// warmth/vignette settle over the whole composed frame — background
// (video OR FallbackRoom) plus glow — identically for both backgrounds.
// Tuned to stay dark/moody by default rather than blown-out; the config's
// full 0-3 intensity range is still reachable via ControlsPanel.
export function PostFX() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.8}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.25}
        mipmapBlur
        blendFunction={BlendFunction.ADD}
      />
      <ColorGradeEffect />
    </EffectComposer>
  );
}
