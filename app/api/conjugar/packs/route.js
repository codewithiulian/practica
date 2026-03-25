import { createClient } from "@supabase/supabase-js";

function getSupabase(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

export async function GET(req) {
  const supabase = getSupabase(req);
  if (!supabase) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const verbId = url.searchParams.get("verbId");
  const verbIds = url.searchParams.get("verbIds");

  let query = supabase.from("drill_packs").select("*");

  if (verbId) {
    query = query.eq("verb_id", verbId);
  } else if (verbIds) {
    query = query.in("verb_id", verbIds.split(","));
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ packs: data });
}
