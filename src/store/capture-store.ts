import { create } from "zustand";

// Bridges the R3F canvas element (set once via Canvas' onCreated) to the
// shutter button living outside the Canvas tree, so BottomControlBar can
// grab a still frame without prop-drilling refs through CameraStage.
interface CaptureState {
  canvasEl: HTMLCanvasElement | null;
  lastCaptureUrl: string | null;
  setCanvasEl: (el: HTMLCanvasElement | null) => void;
  capture: () => string | null;
}

export const useCaptureStore = create<CaptureState>((set, get) => ({
  canvasEl: null,
  lastCaptureUrl: null,
  setCanvasEl: (canvasEl) => set({ canvasEl }),
  capture: () => {
    const { canvasEl } = get();
    if (!canvasEl) return null;
    const url = canvasEl.toDataURL("image/png");
    set({ lastCaptureUrl: url });
    return url;
  },
}));
