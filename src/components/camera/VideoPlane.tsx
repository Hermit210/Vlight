"use client";

import { RefObject, useEffect, useMemo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// object-fit: cover, done in UV space rather than by resizing the plane —
// the standard "cover" remap so the video always fills the viewport
// regardless of the device's camera aspect ratio vs the screen's.
//
// Color grading, vignette, glow, and particles are NOT here — they live in
// ColorGradeEffect (post-processing) and GlowLayers/ParticlesLayer, which
// run identically over this plane or FallbackRoom. This plane's only job
// is displaying the raw camera feed (spec §3: "same code path regardless
// of which background is under it").
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform float uVideoAspect;
  uniform float uPlaneAspect;
  varying vec2 vUv;

  void main() {
    vec2 ratio = vec2(
      min(uPlaneAspect / uVideoAspect, 1.0),
      min(uVideoAspect / uPlaneAspect, 1.0)
    );
    vec2 uv = vec2(
      vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );
    gl_FragColor = texture2D(map, uv);
  }
`;

interface VideoPlaneProps {
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function VideoPlane({ videoRef }: VideoPlaneProps) {
  const { viewport } = useThree();
  const [videoAspect, setVideoAspect] = useState(16 / 9);

  const texture = useMemo(() => {
    const video = videoRef.current;
    if (!video) return null;
    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const updateAspect = () => {
      if (video.videoWidth && video.videoHeight) {
        setVideoAspect(video.videoWidth / video.videoHeight);
      }
    };
    updateAspect();
    video.addEventListener("loadedmetadata", updateAspect);
    return () => video.removeEventListener("loadedmetadata", updateAspect);
  }, [videoRef]);

  const uniforms = useMemo(
    () => ({
      map: { value: texture },
      uVideoAspect: { value: videoAspect },
      uPlaneAspect: { value: viewport.width / viewport.height },
    }),
    // texture/aspect are mutated in place below via useFrame, not re-created
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame(() => {
    uniforms.uVideoAspect.value = videoAspect;
    uniforms.uPlaneAspect.value = viewport.width / viewport.height;
  });

  if (!texture) return null;

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        toneMapped={false}
      />
    </mesh>
  );
}
