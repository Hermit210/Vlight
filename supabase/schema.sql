-- Vlight schema (spec §4). Run this in the Supabase SQL editor once per project.
-- Tables are written to and read from server-side only (Next.js API routes
-- using the service role key) — never queried directly from the browser
-- with the anon key, so no RLS policies are required for v1.

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,               -- guest id (localStorage-generated) or a real auth user id later
  overlay_config jsonb not null,
  created_at timestamptz default now()
);

create table if not exists asset_catalog (
  mint text primary key,
  creator_wallet text not null,
  name text not null,
  price_lamports bigint,
  royalty_bps int,
  remix_of_mint text references asset_catalog(mint),
  overlay_config jsonb not null,
  generated_via_prompt boolean default false,
  source_prompt text,
  thumbnail_url text,
  listed boolean default true,
  created_at timestamptz default now()
);

create table if not exists prompt_credits (
  user_id uuid,
  wallet_address text,
  credits_remaining int not null default 3,
  updated_at timestamptz default now()
);

create table if not exists prompt_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  prompt text not null,
  output_config jsonb,
  succeeded boolean,
  created_at timestamptz default now()
);

create index if not exists asset_catalog_listed_idx on asset_catalog (listed) where listed = true;
create index if not exists asset_catalog_remix_of_idx on asset_catalog (remix_of_mint);
