import { create } from "zustand";
import {
  ColorGrade,
  GlowLayer,
  GlowPosition,
  MAX_GLOW_LAYERS,
  OverlayConfig,
  ParticleType,
  defaultOverlayConfig,
} from "@/types/overlay";

interface OverlayState {
  config: OverlayConfig;
  activePrompt: string;
  selectedGlowId: string | null;

  setColorGrade: (patch: Partial<ColorGrade>) => void;

  addGlowLayer: (position?: GlowPosition) => void;
  updateGlowLayer: (id: string, patch: Partial<GlowLayer>) => void;
  removeGlowLayer: (id: string) => void;
  selectGlow: (id: string | null) => void;

  setParticles: (type: ParticleType, density?: number) => void;
  setVignette: (v: number) => void;

  setActivePrompt: (prompt: string) => void;
  applyGeneratedConfig: (config: OverlayConfig, prompt?: string) => void;
  reset: () => void;
}

export const useOverlayStore = create<OverlayState>((set, get) => ({
  config: defaultOverlayConfig(),
  activePrompt: "",
  selectedGlowId: null,

  setColorGrade: (patch) => {
    const { config } = get();
    set({ config: { ...config, color_grade: { ...config.color_grade, ...patch } } });
  },

  addGlowLayer: (position = "ambient") => {
    const { config } = get();
    if (config.glow_layers.length >= MAX_GLOW_LAYERS) return;
    const layer: GlowLayer = {
      id: crypto.randomUUID(),
      color: "#ffffff",
      intensity: 1,
      position,
      pulse_speed: 0,
    };
    set({
      config: { ...config, glow_layers: [...config.glow_layers, layer] },
      selectedGlowId: layer.id,
    });
  },

  updateGlowLayer: (id, patch) => {
    const { config } = get();
    set({
      config: {
        ...config,
        glow_layers: config.glow_layers.map((g) => (g.id === id ? { ...g, ...patch } : g)),
      },
    });
  },

  removeGlowLayer: (id) => {
    const { config, selectedGlowId } = get();
    set({
      config: { ...config, glow_layers: config.glow_layers.filter((g) => g.id !== id) },
      selectedGlowId: selectedGlowId === id ? null : selectedGlowId,
    });
  },

  selectGlow: (id) => set({ selectedGlowId: id }),

  setParticles: (type, density) => {
    const { config } = get();
    set({
      config: { ...config, particles: { type, density: density ?? config.particles.density } },
    });
  },

  setVignette: (vignette) => {
    const { config } = get();
    set({ config: { ...config, vignette } });
  },

  setActivePrompt: (activePrompt) => set({ activePrompt }),

  // Same render path as manual edits — an AI-generated config just replaces
  // the working config wholesale after server-side validation/clamping.
  applyGeneratedConfig: (config, prompt) =>
    set({ config, activePrompt: prompt ?? get().activePrompt, selectedGlowId: null }),

  reset: () => set({ config: defaultOverlayConfig(), activePrompt: "", selectedGlowId: null }),
}));
