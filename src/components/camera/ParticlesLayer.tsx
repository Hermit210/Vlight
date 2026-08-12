"use client";

import { Sparkles } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useOverlayStore } from "@/store/overlay-store";

// v1 uses drei's <Sparkles> for all three particle kinds — cheap instanced
// point sprites layered in front of the video plane, no hand-rolled
// particle system, per spec §3.
export function ParticlesLayer() {
  const particles = useOverlayStore((s) => s.config.particles);
  const { viewport } = useThree();

  if (particles.type === "none" || particles.density <= 0) return null;

  const count = Math.round(20 + particles.density * 380);
  const scale: [number, number, number] = [viewport.width, viewport.height, 4];

  switch (particles.type) {
    case "dust":
      return (
        <Sparkles count={count} scale={scale} size={1.2} speed={0.15} opacity={0.5} color="#ffffff" />
      );
    case "rain":
      return (
        <Sparkles count={count} scale={scale} size={2} speed={4} opacity={0.4} color="#a8c8ff" />
      );
    case "snow":
      return (
        <Sparkles count={count} scale={scale} size={2.2} speed={0.4} opacity={0.8} color="#ffffff" />
      );
    default:
      return null;
  }
}
