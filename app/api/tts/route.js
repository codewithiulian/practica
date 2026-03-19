export async function POST(req) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "TTS not configured" }, { status: 500 });
  }

  try {
    const { text } = await req.json();
    if (!text) {
      return Response.json({ error: "No text provided" }, { status: 400 });
    }

    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "coral",
        input: text,
        response_format: "mp3",
      }),
    });

    if (!res.ok) {
      return Response.json(
        { error: `TTS error: ${res.status}` },
        { status: 502 }
      );
    }

    const audioBuffer = await res.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (e) {
    return Response.json({ error: "TTS failed" }, { status: 500 });
  }
}
