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

// GET — return updatedAt timestamps for all PDFs in storage (single list call)
export async function GET(req) {
  const supabase = getSupabase(req);
  if (!supabase) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.storage
    .from("lesson-pdfs")
    .list(user.id, { limit: 1000 });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const versions = (data || [])
    .filter((f) => f.name.endsWith(".pdf"))
    .map((f) => ({
      lessonId: f.name.replace(/\.pdf$/, ""),
      updatedAt: f.updated_at,
    }));

  return Response.json(versions);
}
