export async function POST(req) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Chat not configured" }, { status: 500 });
  }

  try {
    const { messages, unitContext } = await req.json();

    const systemPrompt = `You are a friendly Spanish conversation partner for a beginner (A1 level) learner. Your job is to have natural, simple conversations in Spanish to help them practice speaking.

Rules:
- Speak ONLY in Spanish. Keep sentences short and simple (A1 level).
- Use vocabulary and grammar from the current unit context provided below.
- If the user makes a grammar or vocabulary mistake, gently note it — but keep the conversation flowing. Don't turn every turn into a grammar lesson.
- Ask follow-up questions to keep the conversation going.
- If the user seems stuck, offer a simpler way to say what they're trying to say.
- Match their energy — if they give short answers, don't overwhelm them with long responses.
- Be warm, encouraging, patient.

Respond ONLY with a JSON object (no markdown, no backticks):
{"reply": "your Spanish response here", "correction": "brief grammar/vocab note in English if they made an error, otherwise null"}

Current unit material the student is studying:
---
${unitContext || "General beginner Spanish conversation practice."}
---`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("OpenAI error:", res.status, errBody);
      return Response.json(
        { error: `OpenAI error: ${res.status}`, detail: errBody },
        { status: 502 }
      );
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "";

    // Parse the JSON response from the LLM
    try {
      const parsed = JSON.parse(raw);
      return Response.json({
        reply: parsed.reply || raw,
        correction: parsed.correction || null,
      });
    } catch {
      // If LLM didn't return valid JSON, use the raw text as the reply
      return Response.json({ reply: raw, correction: null });
    }
  } catch (e) {
    return Response.json({ error: "Chat failed" }, { status: 500 });
  }
}
