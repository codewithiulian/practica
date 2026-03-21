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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  if (!q || !q.trim()) return Response.json({ error: "q parameter is required" }, { status: 400 });

  // Try full-text search first
  const { data, error } = await supabase.rpc("search_chat_messages", {
    search_query: q.trim(),
    user_id_param: user.id,
    max_results: 20,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // If FTS found results, return them
  if (data && data.length > 0) return Response.json(data);

  // Fallback: ILIKE substring search (catches stop words like "estoy", "de", "que")
  const { data: fallback, error: fbError } = await supabase
    .from("chat_messages")
    .select("id, session_id, role, content, created_at, chat_sessions!inner(title, mode, type)")
    .eq("chat_sessions.type", "chat")
    .ilike("content", `%${q.trim()}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (fbError) return Response.json({ error: fbError.message }, { status: 500 });

  const results = (fallback || []).map((m) => ({
    message_id: m.id,
    session_id: m.session_id,
    session_title: m.chat_sessions?.title,
    session_mode: m.chat_sessions?.mode,
    role: m.role,
    content: m.content,
    created_at: m.created_at,
    rank: 0,
  }));

  return Response.json(results);
}
