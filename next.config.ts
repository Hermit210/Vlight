import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  // Serwist's plugin adds a webpack() config that's inert under Turbopack
  // (dev default) — this empty block tells Turbopack that's intentional.
  turbopack: {},
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Serwist's webpack plugin doesn't support Turbopack (our `next dev`
  // default) — disable it in dev and only generate the SW for the
  // production build, which runs via `next build --webpack`.
  disable: process.env.NODE_ENV !== "production",
});

export default withSerwist(nextConfig);
