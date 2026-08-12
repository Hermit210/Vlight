"use client";

import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

// Bloom is what turns the flat glow sprites into "neon glow" / "warm
// pools of light" — the visual heavy lifting per spec §3.
export function PostFX() {
  return (
    <EffectComposer>
      <Bloom
        intensity={1.1}
        luminanceThreshold={0.1}
        luminanceSmoothing={0.3}
        mipmapBlur
        blendFunction={BlendFunction.ADD}
      />
    </EffectComposer>
  );
}
