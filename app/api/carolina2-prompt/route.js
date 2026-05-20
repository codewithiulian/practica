import { createClient } from "@supabase/supabase-js";
import { buildSystemInstruction } from "../gemini-session/prompt.js";

function getSupabase(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
}

export async function POST(req) {
  try {
    const supabase = getSupabase(req);
    let promptOpts = {};
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) promptOpts = { supabase, userId: user.id };
    }

    const { unitContext } = await req.json();
    const systemInstruction = await buildSystemInstruction(
      unitContext || null,
      promptOpts,
    );
    return Response.json({ systemInstruction });
  } catch (e) {
    return Response.json(
      { error: "Failed to build system instruction" },
      { status: 500 },
    );
  }
}
