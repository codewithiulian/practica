import { createClient } from "@supabase/supabase-js";
import { saveAttemptSchema } from "@/lib/conjugar/schemas.js";
import { calculateGrade } from "@/lib/conjugar/constants.js";

function getSupabase(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

export async function POST(req) {
  const supabase = getSupabase(req);
  if (!supabase) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = saveAttemptSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { packIds, score, total, details } = parsed.data;
    const percentage = Math.round((score / total) * 100);
    const grade = calculateGrade(percentage);

    const { data, error } = await supabase
      .from("drill_attempts")
      .insert({
        user_id: user.id,
        pack_ids: packIds,
        score,
        total,
        percentage,
        grade,
        details,
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data, { status: 201 });
  } catch (e) {
    return Response.json({ error: "Failed to save attempt" }, { status: 500 });
  }
}

export async function GET(req) {
  const supabase = getSupabase(req);
  if (!supabase) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const verbId = url.searchParams.get("verbId");
  const tense = url.searchParams.get("tense");

  // If filtering by verb/tense, find matching pack IDs first
  let filterPackIds = null;
  if (verbId || tense) {
    let packQuery = supabase.from("drill_packs").select("id");
    if (verbId) packQuery = packQuery.eq("verb_id", verbId);
    if (tense) packQuery = packQuery.eq("tense", tense);
    const { data: packs } = await packQuery;
    filterPackIds = (packs || []).map((p) => p.id);
  }

  let query = supabase
    .from("drill_attempts")
    .select("*")
    .order("created_at", { ascending: false });

  if (filterPackIds !== null) {
    if (filterPackIds.length === 0) return Response.json({ attempts: [] });
    query = query.overlaps("pack_ids", filterPackIds);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ attempts: data });
}
