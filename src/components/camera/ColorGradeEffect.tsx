"use client";

import { forwardRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Effect } from "postprocessing";
import * as THREE from "three";
import { useOverlayStore } from "@/store/overlay-store";

// Runs once over the whole composed frame (camera feed OR FallbackRoom —
// spec §3 requires this be the SAME code path for both), after Bloom so
// the grade/vignette also settles over the glow, not just the background.
const fragmentShader = /* glsl */ `
  uniform vec3 uTint;
  uniform float uSaturation;
  uniform float uWarmth;
  uniform float uVignette;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 color = inputColor.rgb;

    // tint: soft overlay blend toward the target color
    color = mix(color, color * uTint * 1.6, 0.25);

    // saturation: blend toward/away from luminance
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luma), color, uSaturation);

    // warmth: push red/blue balance, -1 (cool) to 1 (warm)
    color.r = clamp(color.r + uWarmth * 0.15, 0.0, 1.0);
    color.b = clamp(color.b - uWarmth * 0.15, 0.0, 1.0);

    // vignette: darken toward the frame edges
    float dist = distance(uv, vec2(0.5));
    float vig = smoothstep(0.75, 0.2, dist);
    color *= mix(1.0 - uVignette, 1.0, vig);

    outputColor = vec4(color, inputColor.a);
  }
`;

class ColorGradeImpl extends Effect {
  constructor() {
    super("ColorGradeEffect", fragmentShader, {
      uniforms: new Map<string, THREE.Uniform>([
        ["uTint", new THREE.Uniform(new THREE.Color("#ffffff"))],
        ["uSaturation", new THREE.Uniform(1)],
        ["uWarmth", new THREE.Uniform(0)],
        ["uVignette", new THREE.Uniform(0)],
      ]),
    });
  }
}

export const ColorGradeEffect = forwardRef<ColorGradeImpl>(function ColorGradeEffect(_props, ref) {
  const effect = useMemo(() => new ColorGradeImpl(), []);

  useFrame(() => {
    const { color_grade, vignette } = useOverlayStore.getState().config;
    const uniforms = effect.uniforms;
    (uniforms.get("uTint")!.value as THREE.Color).set(color_grade.tint);
    uniforms.get("uSaturation")!.value = color_grade.saturation;
    uniforms.get("uWarmth")!.value = color_grade.warmth;
    uniforms.get("uVignette")!.value = vignette;
  });

  return <primitive ref={ref} object={effect} dispose={null} />;
});
