"use client";

import { useOverlayStore } from "@/store/overlay-store";
import { ColorField, SelectField, SliderField } from "@/components/ui/fields";
import { GLOW_POSITIONS, MAX_GLOW_LAYERS } from "@/types/overlay";

// Manual overlay controls — free forever, unlimited (spec §0/§8). This will
// be tucked behind the settings icon in the native-camera-style TopBar once
// that lands; for now it renders directly so each shader feature is
// testable as it's built.
export function ControlsPanel() {
  const colorGrade = useOverlayStore((s) => s.config.color_grade);
  const vignette = useOverlayStore((s) => s.config.vignette);
  const setColorGrade = useOverlayStore((s) => s.setColorGrade);
  const setVignette = useOverlayStore((s) => s.setVignette);

  const glowLayers = useOverlayStore((s) => s.config.glow_layers);
  const addGlowLayer = useOverlayStore((s) => s.addGlowLayer);
  const updateGlowLayer = useOverlayStore((s) => s.updateGlowLayer);
  const removeGlowLayer = useOverlayStore((s) => s.removeGlowLayer);

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-10 flex max-h-[calc(100vh-1.5rem)] w-64 flex-col gap-3 overflow-y-auto rounded-xl border border-white/10 bg-black/60 p-3 backdrop-blur-md">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        Color grade
      </h3>
      <ColorField label="Tint" value={colorGrade.tint} onChange={(tint) => setColorGrade({ tint })} />
      <SliderField
        label="Saturation"
        value={colorGrade.saturation}
        min={0.5}
        max={2}
        onChange={(saturation) => setColorGrade({ saturation })}
      />
      <SliderField
        label="Warmth"
        value={colorGrade.warmth}
        min={-1}
        max={1}
        onChange={(warmth) => setColorGrade({ warmth })}
      />
      <SliderField
        label="Vignette"
        value={vignette}
        min={0}
        max={0.5}
        onChange={(v) => setVignette(v)}
      />

      <div className="mt-1 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Glow layers
        </h3>
        <button
          onClick={() => addGlowLayer()}
          disabled={glowLayers.length >= MAX_GLOW_LAYERS}
          className="rounded border border-white/20 px-2 py-0.5 text-[11px] text-zinc-300 hover:bg-white/10 disabled:opacity-30"
        >
          + Add
        </button>
      </div>
      {glowLayers.map((layer) => (
        <div key={layer.id} className="flex flex-col gap-2 rounded-md border border-white/10 bg-white/[0.03] p-2">
          <div className="flex items-center gap-2">
            <ColorField label="Color" value={layer.color} onChange={(color) => updateGlowLayer(layer.id, { color })} />
          </div>
          <SelectField
            label="Position"
            value={layer.position}
            options={GLOW_POSITIONS}
            onChange={(position) => updateGlowLayer(layer.id, { position })}
          />
          <SliderField
            label="Intensity"
            value={layer.intensity}
            min={0}
            max={3}
            onChange={(intensity) => updateGlowLayer(layer.id, { intensity })}
          />
          <SliderField
            label="Pulse speed"
            value={layer.pulse_speed}
            min={0}
            max={2}
            onChange={(pulse_speed) => updateGlowLayer(layer.id, { pulse_speed })}
          />
          <button
            onClick={() => removeGlowLayer(layer.id)}
            className="self-start text-[11px] text-red-400 hover:underline"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
