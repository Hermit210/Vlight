"use client";

import { useOverlayStore } from "@/store/overlay-store";
import { ColorField, SliderField } from "@/components/ui/fields";

// Manual overlay controls — free forever, unlimited (spec §0/§8). This will
// be tucked behind the settings icon in the native-camera-style TopBar once
// that lands; for now it renders directly so each shader feature is
// testable as it's built.
export function ControlsPanel() {
  const colorGrade = useOverlayStore((s) => s.config.color_grade);
  const vignette = useOverlayStore((s) => s.config.vignette);
  const setColorGrade = useOverlayStore((s) => s.setColorGrade);
  const setVignette = useOverlayStore((s) => s.setVignette);

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-10 flex w-64 flex-col gap-3 rounded-xl border border-white/10 bg-black/60 p-3 backdrop-blur-md">
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
    </div>
  );
}
