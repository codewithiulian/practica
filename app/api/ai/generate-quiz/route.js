import { createClient } from "@supabase/supabase-js";
import { getProvider } from "../../../../lib/ai/provider.js";
import { getUserModel } from "../../../../lib/ai/get-user-model.js";
import { loadPrompt } from "../../../../lib/ai/prompts/load-prompt.js";

export const maxDuration = 120;

function getSupabase(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

function stripCodeFences(text) {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  return match ? match[1].trim() : trimmed;
}

function validateQuizData(data) {
  if (!data || typeof data !== "object") return "Quiz data is not an object";
  if (!data.questions || !Array.isArray(data.questions)) return "Missing questions array";
  if (data.questions.length === 0) return "Questions array is empty";

  for (let i = 0; i < data.questions.length; i++) {
    const q = data.questions[i];
    if (!q.type) return `Question ${i + 1} missing type`;
    if (!q.title) return `Question ${i + 1} missing title`;
    if (!q.prompt && !q.question) return `Question ${i + 1} missing prompt`;
  }

  return null;
}

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export async function POST(req) {
  const supabase = getSupabase(req);
  if (!supabase) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    media,
    specificRequirements = "",
    numberOfQuestions = 15,
    lessonId,
    weekId,
    promptSlug = "instant-quiz-generator",
  } = body;

  // Validation
  if (!Array.isArray(media) || media.length === 0) {
    return Response.json({ error: "At least one file is required" }, { status: 400 });
  }
  if (media.length > 10) {
    return Response.json({ error: "Maximum 10 files allowed" }, { status: 400 });
  }
  if (!lessonId && !weekId) {
    return Response.json({ error: "lessonId or weekId is required" }, { status: 400 });
  }

  for (let i = 0; i < media.length; i++) {
    const item = media[i];
    if (!item.base64 || !item.mediaType) {
      return Response.json({ error: `File ${i + 1} missing base64 or mediaType` }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(item.mediaType)) {
      return Response.json({ error: `File ${i + 1} has unsupported type: ${item.mediaType}` }, { status: 400 });
    }
  }

  const questionCount = Math.max(5, Math.min(50, Number(numberOfQuestions) || 15));

  // Verify parent exists
  if (lessonId) {
    const { data, error } = await supabase.from("lessons").select("id").eq("id", lessonId).single();
    if (error || !data) return Response.json({ error: "Lesson not found" }, { status: 404 });
  } else {
    const { data, error } = await supabase.from("weeks").select("id").eq("id", weekId).single();
    if (error || !data) return Response.json({ error: "Week not found" }, { status: 404 });
  }

  // Load prompt with variables
  const systemPrompt = await loadPrompt(`lesson/${promptSlug}`, {
    numberOfQuestions: questionCount,
    specificRequirements: specificRequirements.trim(),
    "quiz-structure.md": await loadPrompt("lesson/quiz-structure", {}, { supabase, userId: user.id }),
  }, { supabase, userId: user.id });

  // Get user's model preference
  const { model_id, provider } = await getUserModel(supabase, user.id, "pdf_processing");
  const ai = getProvider(provider);

  // Classify media for the provider
  const classifiedMedia = media.map((item) => ({
    type: item.mediaType === "application/pdf" ? "pdf" : "image",
    base64: item.base64,
    mediaType: item.mediaType,
    fileName: item.fileName,
  }));

  // Call AI
  let aiResult;
  try {
    aiResult = await ai.generateFromMedia({
      model: model_id,
      system: systemPrompt,
      userMessage: "Generate a quiz based on the attached material. Return ONLY valid JSON.",
      media: classifiedMedia,
      maxTokens: 16384,
    });
  } catch (aiError) {
    console.error("[AI generate-quiz] AI call failed:", aiError);
    return Response.json({ error: `AI generation failed: ${aiError.message}` }, { status: 502 });
  }

  const { content, usage } = aiResult;
  console.log(`[AI generate-quiz] Tokens — input: ${usage?.inputTokens ?? "?"}, output: ${usage?.outputTokens ?? "?"}`);

  // Parse and validate response
  const rawJson = stripCodeFences(content);
  let quizData;
  try {
    quizData = JSON.parse(rawJson);
  } catch {
    console.error("[AI generate-quiz] JSON parse failed. Raw:", rawJson.slice(0, 500));
    return Response.json({ error: "AI returned invalid JSON" }, { status: 502 });
  }

  const validationError = validateQuizData(quizData);
  if (validationError) {
    console.error("[AI generate-quiz] Validation failed:", validationError);
    return Response.json({ error: validationError }, { status: 502 });
  }

  // Save quiz
  const quizTitle = quizData.meta?.title || "AI Generated Quiz";
  const quizDescription = quizData.meta?.description || null;

  const insertPayload = {
    user_id: user.id,
    title: quizTitle,
    description: quizDescription,
    quiz_data: quizData,
    question_count: quizData.questions.length,
    source: "ai-instant",
  };
  if (lessonId) insertPayload.lesson_id = lessonId;
  else insertPayload.week_id = weekId;

  const { data: newQuiz, error: quizError } = await supabase
    .from("quizzes")
    .insert(insertPayload)
    .select("id")
    .single();

  if (quizError) {
    console.error("[AI generate-quiz] DB save failed:", quizError);
    return Response.json({ error: `Failed to save quiz: ${quizError.message}` }, { status: 500 });
  }

  return Response.json({
    quizId: newQuiz.id,
    title: quizTitle,
    questionCount: quizData.questions.length,
  });
}
