import { z } from "zod";

// Mirrors src/types/overlay.ts — the one place both /api/session (storage)
// and /api/generate-overlay (LLM output validation) check an overlay
// config against before it touches anything else. Hex colors are loosely
// validated; numeric ranges are clamped again server-side regardless of
// what passes here (spec §5 — never trust LLM output at face value).
const hexColor = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "must be a #hex color");

export const glowLayerSchema = z.object({
  id: z.string().optional(),
  color: hexColor,
  intensity: z.number().min(0).max(3),
  position: z.enum(["top-left", "top-right", "bottom", "ambient"]),
  pulse_speed: z.number().min(0).max(2),
});

export const overlayConfigSchema = z.object({
  color_grade: z.object({
    tint: hexColor,
    saturation: z.number().min(0.5).max(2),
    warmth: z.number().min(-1).max(1),
  }),
  glow_layers: z.array(glowLayerSchema).max(3),
  particles: z.object({
    type: z.enum(["dust", "rain", "snow", "none"]),
    density: z.number().min(0).max(1),
  }),
  vignette: z.number().min(0).max(0.5),
});

export type ValidatedOverlayConfig = z.infer<typeof overlayConfigSchema>;
