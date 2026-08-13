import "server-only";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { overlayConfigSchema } from "@/lib/overlay-schema";
import { getSupabaseServerClient } from "@/lib/supabase-server";

// claude-haiku-4-5 — this is a narrow structured-output task (spec §1/§5),
// not a reasoning-heavy one, so the cheaper model is the deliberate choice.
const MODEL = "claude-haiku-4-5";
const FREE_CREDITS = 3;

const requestSchema = z.object({
  prompt: z.string().trim().min(1).max(500),
  user_id: z.string().uuid(),
});

const SYSTEM_PROMPT = `You generate a light/color overlay configuration for a live camera AR filter based on a text description.
Keep every value well within the documented ranges. Max 3 entries in "glow_layers".`;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

let anthropic: Anthropic | null = null;
function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY isn't configured (see .env.example).");
  }
  anthropic ??= new Anthropic();
  return anthropic;
}

// Backend checks credits, calls Claude with structured outputs (guarantees
// schema-valid JSON — no markdown-fence stripping or manual JSON.parse),
// clamps server-side regardless of what came back, decrements credits, and
// logs the attempt. Spec §5 — never trust LLM output at face value.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { prompt, user_id } = parsed.data;
  const supabase = getSupabaseServerClient();

  const { data: existingCredit } = await supabase
    .from("prompt_credits")
    .select("credits_remaining")
    .eq("user_id", user_id)
    .maybeSingle();

  let creditsRemaining = existingCredit?.credits_remaining;
  if (creditsRemaining === undefined) {
    const { data: inserted, error } = await supabase
      .from("prompt_credits")
      .insert({ user_id, credits_remaining: FREE_CREDITS })
      .select("credits_remaining")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    creditsRemaining = inserted.credits_remaining;
  }

  if (creditsRemaining <= 0) {
    return NextResponse.json(
      { error: "Out of prompt credits — buy more to keep generating." },
      { status: 402 }
    );
  }

  let parsedOutput: z.infer<typeof overlayConfigSchema> | null = null;
  try {
    const client = getAnthropicClient();
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `User description: ${prompt}` }],
      output_config: { format: zodOutputFormat(overlayConfigSchema) },
    });
    parsedOutput = response.parsed_output;
  } catch {
    await supabase
      .from("prompt_generations")
      .insert({ user_id, prompt, output_config: null, succeeded: false });
    return NextResponse.json({ error: "Generation failed — try again." }, { status: 502 });
  }

  if (!parsedOutput) {
    await supabase
      .from("prompt_generations")
      .insert({ user_id, prompt, output_config: null, succeeded: false });
    return NextResponse.json({ error: "Model returned invalid output — try again." }, { status: 502 });
  }

  const clamped = {
    color_grade: {
      tint: parsedOutput.color_grade.tint,
      saturation: clamp(parsedOutput.color_grade.saturation, 0.5, 2),
      warmth: clamp(parsedOutput.color_grade.warmth, -1, 1),
    },
    glow_layers: parsedOutput.glow_layers.slice(0, 3).map((g) => ({
      id: crypto.randomUUID(),
      color: g.color,
      intensity: clamp(g.intensity, 0, 3),
      position: g.position,
      pulse_speed: clamp(g.pulse_speed, 0, 2),
    })),
    particles: {
      type: parsedOutput.particles.type,
      density: clamp(parsedOutput.particles.density, 0, 1),
    },
    vignette: clamp(parsedOutput.vignette, 0, 0.5),
  };

  const nextCredits = creditsRemaining - 1;
  await supabase
    .from("prompt_credits")
    .update({ credits_remaining: nextCredits, updated_at: new Date().toISOString() })
    .eq("user_id", user_id);
  await supabase
    .from("prompt_generations")
    .insert({ user_id, prompt, output_config: clamped, succeeded: true });

  return NextResponse.json({ config: clamped, credits_remaining: nextCredits });
}
