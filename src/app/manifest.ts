import type { MetadataRoute } from "next";

// display: "standalone" + portrait orientation is what makes the full-bleed
// camera UI (§2) feel like a native app instead of a browser tab.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vlight",
    short_name: "Vlight",
    description: "AI light vibe filter for your live camera feed.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08080c",
    theme_color: "#08080c",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
