"use client";

import { RefObject, useEffect, useMemo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useOverlayStore } from "@/store/overlay-store";

// object-fit: cover, done in UV space rather than by resizing the plane —
// the standard "cover" remap so the video always fills the viewport
// regardless of the device's camera aspect ratio vs the screen's.
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
  uniform vec3 uTint;
  uniform float uSaturation;
  uniform float uWarmth;
  uniform float uVignette;
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
    vec3 color = texture2D(map, uv).rgb;

    // tint: soft overlay blend toward the target color
    color = mix(color, color * uTint * 1.6, 0.25);

    // saturation: blend toward/away from luminance
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luma), color, uSaturation);

    // warmth: push red/blue balance, -1 (cool) to 1 (warm)
    color.r = clamp(color.r + uWarmth * 0.15, 0.0, 1.0);
    color.b = clamp(color.b - uWarmth * 0.15, 0.0, 1.0);

    // vignette: darken toward the frame edges
    float dist = distance(vUv, vec2(0.5));
    float vig = smoothstep(0.75, 0.2, dist);
    color *= mix(1.0 - uVignette, 1.0, vig);

    gl_FragColor = vec4(color, 1.0);
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
      uTint: { value: new THREE.Color("#7dd3fc") },
      uSaturation: { value: 1 },
      uWarmth: { value: 0 },
      uVignette: { value: 0 },
    }),
    // texture/aspect/color-grade are mutated in place below via useFrame, not re-created
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame(() => {
    const { color_grade, vignette } = useOverlayStore.getState().config;
    uniforms.uVideoAspect.value = videoAspect;
    uniforms.uPlaneAspect.value = viewport.width / viewport.height;
    uniforms.uTint.value.set(color_grade.tint);
    uniforms.uSaturation.value = color_grade.saturation;
    uniforms.uWarmth.value = color_grade.warmth;
    uniforms.uVignette.value = vignette;
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
