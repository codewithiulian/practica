const API_URL = "https://api.openai.com/v1/chat/completions";

function headers() {
  return {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function generate({ model, system, messages, maxTokens = 4096 }) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model,
      max_completion_tokens: maxTokens,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage
      ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
      : undefined,
  };
}

// Recursively strip fields OpenAI's strict json_schema mode doesn't accept.
// (`$schema` at the root; `oneOf` is forbidden — zod emits `anyOf` already but be defensive.)
function sanitizeForOpenAIStrict(node) {
  if (Array.isArray(node)) return node.map(sanitizeForOpenAIStrict);
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "$schema") continue;
      if (k === "oneOf") out.anyOf = sanitizeForOpenAIStrict(v);
      else out[k] = sanitizeForOpenAIStrict(v);
    }
    return out;
  }
  return node;
}

/**
 * Structured-output generation via `response_format: json_schema` with `strict: true`.
 * The API guarantees the response matches the schema (validated server-side before return).
 */
export async function generateStructured({ model, system, messages, schema, schemaName = "generate", maxTokens = 4096 }) {
  const strictSchema = sanitizeForOpenAIStrict(schema);

  const res = await fetch(API_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model,
      max_completion_tokens: maxTokens,
      messages: [{ role: "system", content: system }, ...messages],
      response_format: {
        type: "json_schema",
        json_schema: { name: schemaName, strict: true, schema: strictSchema },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${body}`);
  }

  const payload = await res.json();
  return {
    data: JSON.parse(payload.choices[0].message.content),
    usage: payload.usage
      ? { inputTokens: payload.usage.prompt_tokens, outputTokens: payload.usage.completion_tokens }
      : undefined,
  };
}

export async function* streamChat({ model, system, messages, maxTokens = 4096 }) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model,
      max_completion_tokens: maxTokens,
      stream: true,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${body}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      try {
        const data = JSON.parse(line.slice(6));
        const text = data.choices?.[0]?.delta?.content;
        if (text) yield text;
      } catch {}
    }
  }
}

export async function generateFromPDF({ model, system, userMessage, pdfBase64, pdfMediaType, maxTokens = 8192 }) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model,
      max_completion_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            {
              type: "file",
              file: {
                filename: "document.pdf",
                file_data: `data:${pdfMediaType};base64,${pdfBase64}`,
              },
            },
            { type: "text", text: userMessage },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage
      ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
      : undefined,
  };
}

export async function generateFromMedia({ model, system, userMessage, media, maxTokens = 16384 }) {
  const contentBlocks = media.map((item) => {
    if (item.type === "pdf") {
      return {
        type: "file",
        file: {
          filename: item.fileName || "document.pdf",
          file_data: `data:${item.mediaType};base64,${item.base64}`,
        },
      };
    }
    return {
      type: "image_url",
      image_url: { url: `data:${item.mediaType};base64,${item.base64}` },
    };
  });
  contentBlocks.push({ type: "text", text: userMessage });

  const res = await fetch(API_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model,
      max_completion_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: contentBlocks },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage
      ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
      : undefined,
  };
}
