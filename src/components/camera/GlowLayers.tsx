"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useOverlayStore } from "@/store/overlay-store";
import { GlowLayer, GlowPosition } from "@/types/overlay";
import { pulseMultiplier } from "@/lib/pulse";

// Soft radial falloff so glow reads as a light pool, not a hard-edged
// circle — additive blending + the Bloom pass (PostFX) do the rest.
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float dist = distance(vUv, vec2(0.5));
    float falloff = smoothstep(0.5, 0.0, dist);
    gl_FragColor = vec4(uColor * uIntensity, falloff * uIntensity);
  }
`;

function positionFor(position: GlowPosition, vw: number, vh: number): [number, number, number, number] {
  // returns [x, y, z, radiusScale]
  switch (position) {
    case "top-left":
      return [-vw * 0.28, vh * 0.28, 0.05, vw * 0.35];
    case "top-right":
      return [vw * 0.28, vh * 0.28, 0.05, vw * 0.35];
    case "bottom":
      return [0, -vh * 0.32, 0.05, vw * 0.5];
    case "ambient":
    default:
      return [0, 0, 0.05, vw * 0.85];
  }
}

function GlowSprite({ layer }: { layer: GlowLayer }) {
  const { viewport } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(layer.color) },
      uIntensity: { value: layer.intensity },
    }),
    // mutated in place via useFrame
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame((state) => {
    const [x, y, z, radius] = positionFor(layer.position, viewport.width, viewport.height);
    if (meshRef.current) {
      meshRef.current.position.set(x, y, z);
      meshRef.current.scale.setScalar(radius);
    }
    uniforms.uColor.value.set(layer.color);
    uniforms.uIntensity.value = layer.intensity * pulseMultiplier(layer.pulse_speed, state.clock.elapsedTime);
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

export function GlowLayers() {
  const glowLayers = useOverlayStore((s) => s.config.glow_layers);
  return (
    <>
      {glowLayers.map((layer) => (
        <GlowSprite key={layer.id} layer={layer} />
      ))}
    </>
  );
}
