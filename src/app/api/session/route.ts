import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { overlayConfigSchema } from "@/lib/overlay-schema";

const createSessionSchema = z.object({
  owner_id: z.string().uuid(),
  overlay_config: overlayConfigSchema,
});

// Guest-mode session save — no wallet, no auth required (spec §0/§9 step 4).
// owner_id is a client-generated guest id (src/lib/guest-id.ts), not a real
// auth.users row; this is a save/share primitive, not an account system.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({ owner_id: parsed.data.owner_id, overlay_config: parsed.data.overlay_config })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
