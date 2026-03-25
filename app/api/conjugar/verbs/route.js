import { createClient } from "@supabase/supabase-js";
import { createVerbsSchema } from "@/lib/conjugar/schemas.js";
import { detectVerbType } from "@/lib/conjugar/constants.js";

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
    const parsed = createVerbsSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const verbs = [];
    for (const infinitive of parsed.data.infinitives) {
      const lower = infinitive.toLowerCase().trim();
      const verbType = detectVerbType(lower);
      if (!verbType) {
        return Response.json({ error: `Invalid verb ending: "${infinitive}". Must end in -ar, -er, or -ir.` }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("verbs")
        .upsert(
          { user_id: user.id, infinitive: lower, verb_type: verbType },
          { onConflict: "user_id,infinitive" }
        )
        .select()
        .single();

      if (error) return Response.json({ error: error.message }, { status: 500 });
      verbs.push(data);
    }

    return Response.json({ verbs }, { status: 201 });
  } catch (e) {
    return Response.json({ error: "Failed to create verbs" }, { status: 500 });
  }
}

export async function GET(req) {
  const supabase = getSupabase(req);
  if (!supabase) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [verbsRes, packsRes, attemptsRes] = await Promise.all([
      supabase.from("verbs").select("*").order("created_at", { ascending: false }),
      supabase.from("drill_packs").select("id, verb_id, tense, created_at, updated_at"),
      supabase
        .from("drill_attempts")
        .select("pack_ids, percentage, grade, created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (verbsRes.error) return Response.json({ error: verbsRes.error.message }, { status: 500 });

    // Build attempt stats per pack
    const packStats = {};
    for (const attempt of attemptsRes.data || []) {
      for (const packId of attempt.pack_ids) {
        if (!packStats[packId]) {
          packStats[packId] = { attemptCount: 0, lastPercentage: null, lastGrade: null };
        }
        packStats[packId].attemptCount++;
        if (packStats[packId].lastPercentage === null) {
          packStats[packId].lastPercentage = attempt.percentage;
          packStats[packId].lastGrade = attempt.grade;
        }
      }
    }

    // Group packs by verb_id with stats
    const packsByVerb = {};
    for (const pack of packsRes.data || []) {
      if (!packsByVerb[pack.verb_id]) packsByVerb[pack.verb_id] = [];
      const stats = packStats[pack.id] || { attemptCount: 0, lastPercentage: null, lastGrade: null };
      packsByVerb[pack.verb_id].push({
        id: pack.id,
        tense: pack.tense,
        created_at: pack.created_at,
        updated_at: pack.updated_at,
        ...stats,
      });
    }

    const verbs = (verbsRes.data || []).map((verb) => ({
      ...verb,
      packs: packsByVerb[verb.id] || [],
    }));

    return Response.json({ verbs });
  } catch (e) {
    return Response.json({ error: "Failed to fetch verbs" }, { status: 500 });
  }
}
