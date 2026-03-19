export async function POST(req) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "STT not configured" }, { status: 500 });
  }

  try {
    const audioBuffer = await req.arrayBuffer();
    const contentType = req.headers.get("content-type") || "audio/webm";

    const res = await fetch(
      "https://api.deepgram.com/v1/listen?language=es&model=nova-2",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": contentType,
        },
        body: audioBuffer,
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return Response.json(
        { error: `Deepgram error: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text =
      data.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: "STT failed" }, { status: 500 });
  }
}
