# Vlight

A live AR "vibe filter" for your camera — describe a mood in text (or tune it
by hand), watch it composite onto your real room in real time, then mint the
look as a tradeable Metaplex Core asset on Solana. No hardware, no physical
bulbs, no depth-aware AR — this is screen-space compositing (color grade +
glow + particles) over your live camera feed, in the same category as a
Snapchat/Instagram filter.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Three.js / React Three Fiber + `@react-three/postprocessing` for the
  camera-feed VideoTexture, color-grade shader, glow sprites, bloom, and
  particle layers
- Zustand for editor state
- Supabase (session save, shareable links, `asset_catalog` marketplace)
- Anthropic API (structured outputs) for prompt → overlay generation
- Solana: `@solana/wallet-adapter-react` + an Anchor program
  (`register_creator` / `mint_pack` / `list_pack` / `buy_pack`) CPI'ing into
  Metaplex Core
- Serwist for the installable PWA shell

## Getting started

```bash
npm install
npm run dev       # Turbopack — fast local dev, no service worker
```

Open `https://localhost:3000` (or your LAN IP on a phone) and grant camera
access. The manual controls panel (tint/saturation/warmth/vignette/glow
layers/particles) works immediately with zero configuration — no external
services required for that path.

The **production build runs on webpack**, not Turbopack, because Serwist's
service-worker plugin doesn't yet support Turbopack:

```bash
npm run build      # next build --webpack — this is also what generates public/sw.js
npm start
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in what you need. Nothing here
is required to run the manual editor — only for the pieces listed:

| Var | Needed for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Session save/share links, the marketplace gallery (`/api/session`, `/api/packs`) |
| `ANTHROPIC_API_KEY` | Prompt-to-overlay generation (`/api/generate-overlay`) |
| `HELIUS_API_KEY` | Syncing on-chain mint/list/buy events into `asset_catalog` (not yet wired) |

For Supabase: create a project, then run `supabase/schema.sql` in its SQL
editor once.

## Anchor program (`programs/vlight`)

Compiles clean against the currently-installed toolchain: anchor-cli 0.32.1
(via `avm`, not the older 0.30.1 that may still be on `PATH` — invoke it
explicitly as `~/.avm/bin/anchor` if `anchor --version` looks stale) and
mpl-core 0.12.1 built with its `anchor-0-32` feature so its Pubkey/AccountInfo
types unify with `anchor-lang` 0.32.1 (no cross-crate-version CPI hacks
needed).

```bash
~/.avm/bin/anchor build     # -> target/deploy/vlight.so, target/idl/vlight.json
~/.avm/bin/anchor deploy    # needs a funded devnet keypair — see below
```

`Anchor.toml` points `[provider].wallet` at `.wallets/deployer-devnet.json`
(gitignored — generate your own with `solana-keygen new`, then fund it via
`solana airdrop` or https://faucet.solana.com). `PLATFORM_TREASURY` in
`programs/vlight/src/lib.rs` is a devnet placeholder keypair — swap it for a
real treasury wallet before any mainnet deployment.

**What's wired vs. staged:** the program itself is complete and compiles —
all four instructions, Metaplex Core CPI for minting, atomic SOL split
(platform fee / remix royalty / seller) for buying. The *client-side*
Mint/Buy buttons in the UI are intentionally disabled placeholders (see
`PublishSheet.tsx`, `GalleryModal.tsx`) — wiring them up means building the
actual `@solana/web3.js` transactions against the deployed program ID, which
depends on a live deployment existing first.

## What's live vs. staged

Fully functional today, no external accounts needed: the camera pipeline
(permission → VideoTexture → color grade → glow → bloom → particles), the
manual controls panel, the native-camera-style UI chrome, capture/share
sheet UI, wallet connect (devnet, no key required), and PWA install.

Wired but inert until you supply the matching env var: session save/share
links and the gallery (Supabase), prompt generation (Anthropic), on-chain
mint/list/buy (needs a deployed program + Helius webhook sync).

## Project structure

```
src/
  app/                    routes: / (camera), /s/[id] (shared session),
                           api/session, api/generate-overlay, api/packs
  components/
    camera/                CameraStage, VideoPlane (shader), GlowLayers,
                            ParticlesLayer, PostFX, TopBar/PromptBar/
                            BottomControlBar, ControlsPanel
    wallet/                WalletContextProvider, PublishSheet (mint UI)
    marketplace/           GalleryModal (browse + remix + buy UI)
  store/                   overlay-store (the Pack config — same shape
                           whether hand-tuned or AI-generated), capture-
                           store, credits-store
  lib/                     overlay-schema (Zod, shared by session save and
                           LLM output validation), supabase-server, guest-id
  types/overlay.ts          OverlayConfig — the tokenizable unit
programs/vlight/            Anchor program
supabase/schema.sql          sessions / asset_catalog / prompt_credits /
                             prompt_generations
```
