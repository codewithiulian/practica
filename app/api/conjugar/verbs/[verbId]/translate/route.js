import { createClient } from "@supabase/supabase-js";
import { getProvider } from "../../../../../../lib/ai/provider.js";
import { getUserModel } from "../../../../../../lib/ai/get-user-model.js";

function getSupabase(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
}

/**
 * Lazily backfills `verbs.translation_en` for verbs created before the column existed.
 * Idempotent: if already populated, returns the existing value without hitting the model.
 */
export async function POST(req, { params }) {
  const supabase = getSupabase(req);
  if (!supabase) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { verbId } = await params;
  if (!verbId) return Response.json({ error: "Missing verbId" }, { status: 400 });

  const { data: verb, error: verbErr } = await supabase
    .from("verbs")
    .select("id, infinitive, translation_en")
    .eq("id", verbId)
    .single();

  if (verbErr || !verb) return Response.json({ error: "Verb not found" }, { status: 404 });

  if (verb.translation_en) {
    return Response.json({ translation_en: verb.translation_en });
  }

  const { model_id, provider } = await getUserModel(supabase, user.id, "conjugar");
  const ai = getProvider(provider);

  let raw;
  try {
    const result = await ai.generate({
      model: model_id,
      system: "You are a Spanish-to-English translator. Reply with ONLY the English infinitive form of the given verb, starting with 'to '. No punctuation, no explanation, no quotes. Examples: 'hablar' → 'to speak', 'despertarse' → 'to wake up'.",
      messages: [{ role: "user", content: verb.infinitive }],
      maxTokens: 32,
    });
    raw = result.content;
  } catch (e) {
    return Response.json({ error: `AI provider error: ${e.message || "unknown"}` }, { status: 502 });
  }

  const translation = String(raw || "").trim().replace(/^["']|["']$/g, "").toLowerCase();
  if (!translation.startsWith("to ") || translation.length > 80) {
    return Response.json({ error: "AI returned an unexpected translation" }, { status: 502 });
  }

  const { error: updateErr } = await supabase
    .from("verbs")
    .update({ translation_en: translation })
    .eq("id", verbId);

  if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });

  return Response.json({ translation_en: translation });
}
