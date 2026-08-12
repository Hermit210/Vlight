// Breathing intensity multiplier for glow layers. pulse_speed === 0 means
// static (no animation) — anything above animates a soft sine breathe.
export function pulseMultiplier(pulseSpeed: number, t: number): number {
  if (pulseSpeed <= 0) return 1;
  return 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * pulseSpeed * Math.PI * 2));
}
