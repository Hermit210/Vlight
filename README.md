  **Mood Rooms": Solana-Native Lighting/Atmosphere Studio
"Mood Rooms — a Solana-native studio where lighting, color, and atmosphere (not furniture) are the creative medium: build a vibe in seconds, remix anyone's, and mint/sell your lighting packs as ownable Metaplex Core assets."
Use this as a single, complete spec — feed it to Claude Code / Cursor / Kiro as-is. Scope is locked deliberately narrow (per the prior-art findings: Portals already owns "tokenize the whole room," so this product does NOT compete there — it competes on lighting/atmosphere as the tradeable unit).

---

## 0. LOCKED PRODUCT DEFINITION (do not expand without re-reading this section)

**What it is:** A browser 3D space where a user authors light, color, fog, and sound — not furniture, not layout — and can save that authored "vibe" as a reusable, ownable, sellable asset (a Pack). Rooms/geometry are free and personal, never tokenized. Packs are the only tokenized unit.

**What ships in v1:**
- Guest mode, zero wallet required to build/save/share a room
- 4 pre-built environments (no custom geometry/furniture building in v1)
- Lighting + atmosphere + sound editor (the core product)
- Save room, generate shareable link
- One-click remix of any published room
- Wallet connect (optional, appears only when publishing a Pack)
- Mint a Pack as a Metaplex Core asset, list it, buy it with SOL, apply it instantly

**Explicitly OUT of v1 — do not build these unless told otherwise:**
- Multiplayer / live co-editing
- Custom object/furniture upload or geometry editing
- Tokenizing the room itself
- A platform token
- Full social graph (follows/comments) — a public gallery + share link is enough
- AI text-to-scene geometry generation

---

## 1. TECH STACK — VERIFIED CURRENT PACKAGES/LINKS

### Frontend framework
- **Next.js** (App Router) + **TypeScript** — https://nextjs.org/docs
- **Tailwind CSS** — https://tailwindcss.com/docs
- **shadcn/ui** — https://ui.shadcn.com/docs

### 3D engine
- **Three.js** — https://threejs.org/docs/
- **React Three Fiber** — `npm i @react-three/fiber` — https://r3f.docs.pmnd.rs/
- **drei** (helpers: environment, controls, postprocessing helpers) — `npm i @react-three/drei` — https://github.com/pmndrs/drei
- **postprocessing** (bloom for neon/glow effects — important for the lighting product) — `npm i postprocessing @react-three/postprocessing` — https://github.com/pmndrs/react-postprocessing
- **leva** (dev-time GUI, useful for building your own lighting control panel UX reference) — `npm i leva` — https://github.com/pmndrs/leva

### State management
- **Zustand** — `npm i zustand` — https://zustand.docs.pmnd.rs/

### Audio / music-reactive lighting
- **Tone.js** (scheduling, synths, effects — good for ambient embedded soundtracks) — `npm i tone` — https://tonejs.github.io/
- **Web Audio API** (native — for real-time frequency analysis driving light animation; no package needed, use `AnalyserNode`) — https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- **Howler.js** (simpler audio playback layer if Tone.js is overkill for v1) — `npm i howler` — https://howlerjs.com/

### Backend / database
- **Supabase** (Postgres + Storage + Auth for guest/account flow) — https://supabase.com/docs
- Alternative lightweight object storage: **Cloudflare R2** — https://developers.cloudflare.com/r2/

### Solana — wallet layer
- **@solana/wallet-adapter-react** + **@solana/wallet-adapter-react-ui** + **@solana/wallet-adapter-wallets** — https://github.com/anza-xyz/wallet-adapter — setup guide: https://solana.com/developers/cookbook/wallets/connect-wallet-react
- **@solana/web3.js** — https://solana.com/docs/clients/javascript

### Solana — program framework
- **Anchor** (Rust framework for the on-chain program) — install via AVM: `cargo install avm --git https://github.com/coral-xyz/anchor`, then `avm install latest && avm use latest` — https://www.anchor-lang.com/docs
- Browser-based, zero-setup option for prototyping the program fast: **Solana Playground** — https://beta.solpg.io/

### Solana — asset/NFT layer (THIS IS THE KEY DECISION)
- **Metaplex Core** — the current recommended NFT standard for new Solana projects. Single-account design (~0.0029 SOL per mint vs ~0.022 SOL for legacy Token Metadata), enforced royalties by default, plugin system for custom behavior (attributes, royalty splits, allowlists).
  - JS/TS SDK: `npm install @metaplex-foundation/mpl-core @metaplex-foundation/umi @metaplex-foundation/umi-bundle-defaults` — https://www.metaplex.com/docs/smart-contracts/core
  - Wallet-adapter signer bridge: `npm i @metaplex-foundation/umi-signer-wallet-adapters` — connects your existing wallet-adapter session to Umi for signing mint/list/buy transactions
  - Create-asset guide: https://www.metaplex.com/docs/smart-contracts/core/create-asset
  - **Do not use** `@metaplex-foundation/js` (legacy, deprecated) or `@metaplex/js` (deprecated, unsupported) — both show deprecation notices on npm as of 2026.
  - **Do not use Bubblegum/compressed NFTs** for v1 — Core is simpler to ship correctly in a short build window and your Pack volume (creator-authored assets, not mass-generated) doesn't need cNFT-scale compression economics.

### RPC / indexing
- **Helius** (Solana RPC + webhooks, used to index on-chain mint/list/buy events back into your Postgres `asset_catalog` cache so the app never hits RPC on the hot path) — https://www.helius.dev/docs
- Alternative: **QuickNode** Solana endpoints — https://www.quicknode.com/docs/solana

---

## 2. DATA MODEL (Postgres)

```sql
-- rooms: personal, free, never tokenized
create table rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,               -- nullable for guest mode (local/session-scoped)
  title text,
  environment_id text not null,     -- one of 4 preset environments
  lighting jsonb not null,          -- { lights: [...], effects: [...], color_palette, fog, particles }
  sound jsonb,                      -- { track_id, volume, reactive: bool }
  applied_pack_mints text[],        -- Metaplex Core mint addresses of any purchased Packs applied
  is_published boolean default false,
  remix_of_room_id uuid references rooms(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- asset_catalog: mirrors on-chain Pack mints for fast querying (synced via Helius webhook)
create table asset_catalog (
  mint text primary key,            -- Metaplex Core asset address
  creator_wallet text not null,
  kind text not null,               -- 'lighting_pack' | 'atmosphere_pack' | 'sound_pack'
  name text not null,
  price_lamports bigint,
  royalty_bps int,
  remix_of_mint text references asset_catalog(mint),
  config jsonb not null,            -- the actual lighting/atmosphere/sound parameters this Pack applies
  thumbnail_url text,
  listed boolean default true,
  created_at timestamptz default now()
);
```

**Pack config shape** (this is the actual tradeable "vibe" — same shape you'd store in `rooms.lighting`/`sound` when applied):
```json
{
  "lights": [
    { "type": "point|spot|area|neon", "color": "#hex", "intensity": 1.0, "range": 10, "softness": 0.3 }
  ],
  "effects": [
    { "type": "pulse|breathing|rainbow|flicker", "speed": 1.0, "target": "light_id" }
  ],
  "color_palette": ["#hex", "#hex"],
  "fog": { "density": 0.02, "color": "#hex" },
  "particles": { "type": "dust|rain|snow|none", "density": 0.5 },
  "sound": { "track_url": "...", "reactive": true }
}
```

---

## 3. ANCHOR PROGRAM — INSTRUCTION SET (keep this exact list; do not add instructions without reason)

```
register_creator      // wallet -> creator PDA, one-time
mint_pack              // mints a Metaplex Core asset representing one lighting/atmosphere/sound config
list_pack               // lists a minted pack for sale, sets price + royalty_bps
buy_pack                // atomic transfer + payment split (seller, platform fee, royalty if remix)
```

**Explicitly do NOT build:** `create_room`, `update_room`, `publish_room` on-chain (rooms live entirely in Postgres — no reason for them to touch the chain), or any room/geometry NFT minting instruction.

**PDA seeds:**
```
CreatorPDA:       ["creator", wallet]
ListingPDA:       ["listing", mint]
```

Royalty enforcement: use Metaplex Core's built-in **Royalties plugin** at mint time (set basis points + creator address) rather than building custom royalty logic — this is enforced by the Core program itself, not something you need to reimplement. Reference: https://www.metaplex.com/docs/smart-contracts/core

---

## 4. ARCHITECTURE

```
Browser (Next.js + R3F)
  ├─ 3D render, lighting shaders, particle/fog systems — 100% client-side, never touches chain
  ├─ Zustand editor state
  ├─ Web Audio API analyser -> drives reactive-lighting shader uniforms
  ├─ Wallet Adapter (lazy-loaded, only mounts when user opens "Publish")
  ↓
Next.js API routes
  ├─ Room CRUD (Supabase)
  ├─ Pack catalog reads (from asset_catalog, synced via Helius webhook — never live RPC calls on page load)
  ↓
Supabase Postgres + Storage
  ├─ rooms, asset_catalog tables (§2)
  ├─ thumbnail/audio file storage
  ↓
Solana (touched only on: register_creator, mint_pack, list_pack, buy_pack)
  ├─ Anchor program (§3)
  ├─ Metaplex Core for the actual asset tokens
  ├─ Helius webhook -> writes back to asset_catalog on any mint/list/buy event
```

---

## 5. LIGHTING/EFFECT IMPLEMENTATION NOTES (the actual hard, high-value part)

- Real Three.js lights (point/spot/area) for the 2–4 "hero" lights that cast shadows. Cap dynamic shadow-casting lights at 4 for performance.
- Everything else (neon glow, RGB pulse, rainbow, breathing, flicker) = **emissive-material shaders with animated uniforms**, not literal dynamic lights — cheaper to run, and this is where `@react-three/postprocessing`'s bloom pass does the visual heavy lifting for the "premium glow" look.
- Music-reactive: `AnalyserNode.getByteFrequencyData()` → normalize → feed into shader uniform (e.g. drive emissive intensity or pulse speed off bass frequencies). This is your strongest 5-second demo clip.
- Fog: `THREE.FogExp2`, density as an editable parameter, cheap.
- Particles: instanced geometry or a lightweight particle library — don't hand-roll a full particle system for v1; `drei`'s `<Sparkles>` or a simple instanced-mesh approach is enough for "dust/rain/snow."

---

## 6. BUILD ORDER

1. R3F scene shell, camera controls, 4 preset environments loaded as GLB (day 1)
2. Lighting editor UI: hero lights + 2 shader effects + bloom postprocessing (day 1–2)
3. Fog + particles + sound layer, reactive-lighting hookup (day 2)
4. Save/load room to Supabase, guest mode, shareable link (day 2–3)
5. Wallet adapter integration, gated behind "Publish" only (day 3)
6. Anchor program: register_creator, mint_pack, list_pack, buy_pack — deploy to devnet first via Solana Playground for speed, then move to local Anchor project (day 3–4)
7. Wire marketplace UI to asset_catalog + Helius webhook sync (day 4)
8. Remix flow + polish + demo script (day 4–5)

---

## 7. DEMO SCRIPT (for pitch/hackathon)

1. Land on a pre-lit room, zero wallet, zero signup.
2. Drag one slider — fog density or color temperature — whole mood shifts in real time. This is the hook; it has to land in under 10 seconds.
3. Hit "Remix" on a sample published room, change 2–3 things, get a shareable link — under 30 seconds total.
4. Connect wallet, publish the remix's custom lighting config as a Pack — show one real, verifiable on-chain mint + listing.
5. Close by buying a Pack from a second (demo) wallet, showing the royalty split land back to the original creator.

Say explicitly in the pitch: rooms are never tokenized — only reusable lighting/atmosphere/sound Packs are, because that's the part with actual resale value, unlike a one-off personal room composition.
