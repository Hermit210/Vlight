"use client";

// Illustrated fallback background for when camera access is denied,
// unavailable, or skipped — a locked, first-class requirement (spec §0):
// "the describe a vibe, see the effect experience must work in both
// cases." Deliberately dark and plain so generated glow/particles read
// clearly against it rather than competing with a busy scene.
export function FallbackRoom() {
  return (
    <group position={[0, -1, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, -2]}>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#0d0d12" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3, -6]}>
        <planeGeometry args={[16, 8]} />
        <meshStandardMaterial color="#111118" roughness={0.95} />
      </mesh>
      <mesh position={[-7, 3, -2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#0a0a0f" roughness={0.95} />
      </mesh>
      <mesh position={[7, 3, -2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#0a0a0f" roughness={0.95} />
      </mesh>
      <ambientLight intensity={0.12} />
      <pointLight position={[0, 4, 2]} intensity={0.3} distance={14} decay={2} />
    </group>
  );
}
