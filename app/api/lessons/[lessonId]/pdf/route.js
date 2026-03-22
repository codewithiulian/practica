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

// GET — return a signed URL for the lesson's PDF
export async function GET(req, { params }) {
  const supabase = getSupabase(req);
  if (!supabase) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = await params;
  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("pdf_path, pdf_name, pdf_size")
    .eq("id", lessonId)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!lesson?.pdf_path) return Response.json({ error: "No PDF attached" }, { status: 404 });

  const { data: signed, error: signError } = await supabase.storage
    .from("lesson-pdfs")
    .createSignedUrl(lesson.pdf_path, 3600);

  if (signError) return Response.json({ error: signError.message }, { status: 500 });

  return Response.json({
    url: signed.signedUrl,
    pdfName: lesson.pdf_name,
    pdfSize: lesson.pdf_size,
  });
}

// PUT — upload a PDF for a lesson
export async function PUT(req, { params }) {
  const supabase = getSupabase(req);
  if (!supabase) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = await params;
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || file.type !== "application/pdf") {
    return Response.json({ error: "PDF file required" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return Response.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  const storagePath = `${user.id}/${lessonId}.pdf`;

  // Upload to storage (upsert to overwrite existing)
  const { error: uploadError } = await supabase.storage
    .from("lesson-pdfs")
    .upload(storagePath, file, { upsert: true, contentType: "application/pdf" });

  if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 });

  // Update lesson row
  const { data: lesson, error: updateError } = await supabase
    .from("lessons")
    .update({ pdf_path: storagePath, pdf_name: file.name, pdf_size: file.size })
    .eq("id", lessonId)
    .select()
    .single();

  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });
  return Response.json(lesson);
}

// PATCH — update lesson metadata after external compression upload
export async function PATCH(req, { params }) {
  const supabase = getSupabase(req);
  if (!supabase) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = await params;
  const { storagePath, originalName, compressedSize } = await req.json();

  if (!storagePath || !originalName || !compressedSize) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Security: ensure the storage path belongs to this user
  if (!storagePath.startsWith(`${user.id}/`)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: lesson, error } = await supabase
    .from("lessons")
    .update({ pdf_path: storagePath, pdf_name: originalName, pdf_size: compressedSize })
    .eq("id", lessonId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(lesson);
}

// DELETE — remove PDF from a lesson
export async function DELETE(req, { params }) {
  const supabase = getSupabase(req);
  if (!supabase) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = await params;

  // Get the current path
  const { data: lesson } = await supabase
    .from("lessons")
    .select("pdf_path")
    .eq("id", lessonId)
    .single();

  if (lesson?.pdf_path) {
    await supabase.storage.from("lesson-pdfs").remove([lesson.pdf_path]);
  }

  const { error } = await supabase
    .from("lessons")
    .update({ pdf_path: null, pdf_name: null, pdf_size: null })
    .eq("id", lessonId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
