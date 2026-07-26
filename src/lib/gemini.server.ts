// Server-only Gemini client. Isolated so provider can be swapped.
// DO NOT import from client code.

const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export async function geminiChat(opts: {
  messages: ChatMsg[];
  model?: string;
  temperature?: number;
  response_format?: { type: "json_object" };
  max_tokens?: number;
}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");

  const model = opts.model ?? GEMINI_MODEL;
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${key}`;

  // Gemini separates system instructions from the conversation turns.
  const systemParts = opts.messages
    .filter((m) => m.role === "system")
    .map((m) => ({ text: m.content }));

  // Gemini uses "model" instead of "assistant" for the AI role.
  const contents = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
      maxOutputTokens: opts.max_tokens ?? 1200,
      ...(opts.response_format?.type === "json_object"
        ? { responseMimeType: "application/json" }
        : {}),
    },
  };

  if (systemParts.length > 0) {
    body.systemInstruction = { parts: systemParts };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}
