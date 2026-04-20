import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generate({ model, system, messages, maxTokens = 4096 }) {
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages,
  });

  const content = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  return {
    content,
    usage: response.usage
      ? { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }
      : undefined,
  };
}

/**
 * Structured-output generation via tool use with forced tool_choice.
 * The model is guaranteed to return a tool_use block whose `input` matches the given JSON Schema.
 */
export async function generateStructured({ model, system, messages, schema, schemaName = "generate", schemaDescription = "Return the structured result.", maxTokens = 4096 }) {
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages,
    tools: [{ name: schemaName, description: schemaDescription, input_schema: schema }],
    tool_choice: { type: "tool", name: schemaName },
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse) throw new Error("Model did not return a tool_use block");

  return {
    data: toolUse.input,
    usage: response.usage
      ? { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }
      : undefined,
  };
}

export async function* streamChat({ model, system, messages, maxTokens = 4096 }) {
  const stream = client.messages.stream({
    model,
    max_tokens: maxTokens,
    system,
    messages,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

export async function generateFromPDF({ model, system, userMessage, pdfBase64, pdfMediaType, maxTokens = 8192 }) {
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: pdfMediaType, data: pdfBase64 },
          },
          { type: "text", text: userMessage },
        ],
      },
    ],
  });

  const content = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  return {
    content,
    usage: response.usage
      ? { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }
      : undefined,
  };
}

export async function generateFromMedia({ model, system, userMessage, media, maxTokens = 16384 }) {
  const contentBlocks = media.map((item) => {
    if (item.type === "pdf") {
      return {
        type: "document",
        source: { type: "base64", media_type: item.mediaType, data: item.base64 },
      };
    }
    return {
      type: "image",
      source: { type: "base64", media_type: item.mediaType, data: item.base64 },
    };
  });
  contentBlocks.push({ type: "text", text: userMessage });

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: contentBlocks }],
  });

  const content = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  return {
    content,
    usage: response.usage
      ? { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }
      : undefined,
  };
}
