import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

// Reads asset_catalog — populated by the Helius webhook sync on mint/list
// events (spec §7), never a live RPC call on page load.
export async function GET() {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("asset_catalog")
    .select(
      "mint, creator_wallet, name, price_lamports, royalty_bps, remix_of_mint, overlay_config, generated_via_prompt, source_prompt, thumbnail_url, created_at"
    )
    .eq("listed", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ packs: data });
}
