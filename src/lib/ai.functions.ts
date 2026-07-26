import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { geminiChat } from "./gemini.server";

const TangentInput = z.object({
  topic: z.string().max(500),
  segments: z.array(z.object({
    start: z.number(),
    end: z.number(),
    text: z.string(),
  })).max(4000),
});

export const detectTangents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => TangentInput.parse(v))
  .handler(async ({ data }) => {
    // Compact transcript with timestamps for the model
    const transcript = data.segments.map((s) => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text}`).join("\n");
    const sys = `You are an expert podcast editor. Given a one-line episode topic and a timestamped transcript, identify passages that drift off-topic (tangents unrelated to the stated topic). Only flag substantial drifts — small asides are fine.

Return STRICT JSON with shape:
{"tangents":[{"start":<seconds>,"end":<seconds>,"reason":"<one-sentence plain english reason>"}]}

Rules:
- start/end MUST be exact numbers copied from the [start-end] markers in the transcript (never invent).
- Each flagged tangent should be at least 5 seconds.
- If nothing drifts, return {"tangents":[]}.
- Maximum 20 tangents.`;
    const user = `TOPIC: ${data.topic || "(no topic provided)"}\n\nTRANSCRIPT:\n${transcript.slice(0, 60000)}`;

    const raw = await geminiChat({
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 2000,
    });

    let parsed: { tangents?: Array<{ start: number; end: number; reason: string }> };
    try { parsed = JSON.parse(raw); } catch { parsed = { tangents: [] }; }
    const out = (parsed.tangents ?? []).filter((t) => typeof t.start === "number" && typeof t.end === "number" && t.end > t.start);
    return { tangents: out };
  });

const AskEpisodeInput = z.object({
  question: z.string().min(1).max(2000),
  segments: z.array(z.object({ start: z.number(), end: z.number(), text: z.string() })).max(4000),
  thread_id: z.string().uuid().optional(),
  episode_id: z.string().uuid(),
});

export const askEpisode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => AskEpisodeInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Ensure a thread for this episode
    let threadId = data.thread_id;
    if (!threadId) {
      const { data: existing } = await supabase.from("chat_threads")
        .select("id").eq("kind", "episode").eq("episode_id", data.episode_id).maybeSingle();
      if (existing) threadId = existing.id;
      else {
        const { data: t, error } = await supabase.from("chat_threads").insert({
          user_id: userId, kind: "episode", episode_id: data.episode_id, title: "Ask this episode",
        }).select("id").single();
        if (error) throw new Error(error.message);
        threadId = t.id;
      }
    }

    // Save user message
    await supabase.from("chat_messages").insert({
      thread_id: threadId, user_id: userId, role: "user", content: data.question,
    });

    // Load recent history
    const { data: hist } = await supabase.from("chat_messages")
      .select("role, content").eq("thread_id", threadId).order("created_at").limit(20);

    const transcript = data.segments.map((s) => `[${s.start.toFixed(1)}s] ${s.text}`).join("\n").slice(0, 60000);
    const sys = `You answer questions about a specific podcast/video episode. You are given a timestamped transcript. When you cite a moment, embed the timestamp in seconds inside <ts>NUMBER</ts> tags so the UI can make it clickable. Only cite timestamps that appear in the transcript. Be concise.`;
    const msgs = [
      { role: "system" as const, content: sys },
      { role: "user" as const, content: `TRANSCRIPT:\n${transcript}` },
      ...(hist ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    const reply = await geminiChat({ messages: msgs, temperature: 0.3, max_tokens: 700 });

    await supabase.from("chat_messages").insert({
      thread_id: threadId, user_id: userId, role: "assistant", content: reply,
    });

    return { reply, thread_id: threadId };
  });

const SupportInput = z.object({ question: z.string().min(1).max(2000) });

export const supportChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => SupportInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Find/create support thread
    let threadId: string;
    const { data: existing } = await supabase.from("chat_threads")
      .select("id").eq("kind", "support").eq("user_id", userId).maybeSingle();
    if (existing) threadId = existing.id;
    else {
      const { data: t, error } = await supabase.from("chat_threads").insert({
        user_id: userId, kind: "support", title: "Cut Points support",
      }).select("id").single();
      if (error) throw new Error(error.message);
      threadId = t.id;
    }

    await supabase.from("chat_messages").insert({
      thread_id: threadId, user_id: userId, role: "user", content: data.question,
    });

    const { data: hist } = await supabase.from("chat_messages")
      .select("role, content").eq("thread_id", threadId).order("created_at").limit(20);

    const sys = `You are the friendly support bot for Cut Points, an AI co-editor for podcasts and videos. Cut Points does two things: (1) client-side signal analysis of uploaded audio to flag "dead air" (sustained silence) and "energy dips" (10+ dB below rolling average), and (2) AI-based "tangent" detection from the transcript against a user-supplied episode topic. Users review each flagged cut, accept/reject it, and export accepted cuts to Premiere Pro XML markers, Audacity label track (.txt), or CSV. Other features: Settings (silence threshold, default export format), History (past episodes), "Ask the episode" (chat about the actual content of an uploaded episode — different from you, which is about the product). Answer product/how-to questions clearly and briefly. If asked something outside the product, redirect politely.`;
    const msgs = [
      { role: "system" as const, content: sys },
      ...(hist ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];
    const reply = await geminiChat({ messages: msgs, temperature: 0.4, max_tokens: 500 });

    await supabase.from("chat_messages").insert({
      thread_id: threadId, user_id: userId, role: "assistant", content: reply,
    });

    return { reply, thread_id: threadId };
  });

export const getThreadMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({
    kind: z.enum(["support", "episode"]),
    episode_id: z.string().uuid().optional(),
  }).parse(v))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase.from("chat_threads").select("id").eq("kind", data.kind);
    if (data.kind === "episode" && data.episode_id) q = q.eq("episode_id", data.episode_id);
    const { data: t } = await q.maybeSingle();
    if (!t) return { messages: [] as Array<{ role: string; content: string }> };
    const { data: msgs } = await supabase.from("chat_messages")
      .select("role, content, created_at").eq("thread_id", t.id).order("created_at");
    return { messages: msgs ?? [] };
  });
