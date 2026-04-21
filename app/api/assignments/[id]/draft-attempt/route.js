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

// Idempotent: returns the latest open draft attempt for the assignment,
// creating v1 if none exist. RLS enforces that the bearer owns the assignment.
export async function POST(req, { params }) {
  const supabase = getSupabase(req);
  if (!supabase) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: assignmentId } = await params;

  // Verify the assignment exists + is owned by this user (RLS handles the latter).
  const { data: assignment, error: assignErr } = await supabase
    .from("assignments")
    .select("id")
    .eq("id", assignmentId)
    .single();
  if (assignErr) {
    if (assignErr.code === "PGRST116") return Response.json({ error: "Assignment not found" }, { status: 404 });
    return Response.json({ error: assignErr.message }, { status: 500 });
  }

  const { data: existing, error: queryErr } = await supabase
    .from("attempts")
    .select("id, version_number, essay, word_count, submitted_at")
    .eq("assignment_id", assignmentId)
    .order("version_number", { ascending: false })
    .limit(1);
  if (queryErr) return Response.json({ error: queryErr.message }, { status: 500 });

  const latest = existing?.[0];
  if (latest && latest.submitted_at === null) {
    return Response.json(latest);
  }

  const nextVersion = latest ? latest.version_number + 1 : 1;
  const { data: created, error: insertErr } = await supabase
    .from("attempts")
    .insert({
      assignment_id: assignmentId,
      version_number: nextVersion,
      essay: "",
      word_count: 0,
    })
    .select("id, version_number, essay, word_count, submitted_at")
    .single();

  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });
  return Response.json(created);
}
