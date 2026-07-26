import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EpisodeCreate = z.object({
  name: z.string().min(1).max(200),
  topic: z.string().max(500).default(""),
  duration_seconds: z.number().min(0),
  waveform_peaks: z.array(z.number()).max(4000),
  transcript_text: z.string().max(500_000),
  transcript_segments: z.array(z.object({
    start: z.number(),
    end: z.number(),
    text: z.string(),
  })).max(10_000),
  audio_path: z.string().nullable().optional(),
  audio_mime: z.string().nullable().optional(),
});

export const createEpisode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => EpisodeCreate.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase.from("episodes").insert({
      user_id: userId,
      name: data.name,
      topic: data.topic,
      duration_seconds: data.duration_seconds,
      waveform_peaks: data.waveform_peaks,
      transcript_text: data.transcript_text,
      transcript_segments: data.transcript_segments,
      audio_path: data.audio_path ?? null,
      audio_mime: data.audio_mime ?? null,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const listEpisodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("episodes")
      .select("id, name, topic, duration_seconds, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getEpisode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const [{ data: ep, error: e1 }, { data: cuts, error: e2 }] = await Promise.all([
      context.supabase.from("episodes").select("*").eq("id", data.id).single(),
      context.supabase.from("cuts").select("*").eq("episode_id", data.id).order("start_sec"),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    return { episode: ep, cuts: cuts ?? [] };
  });

export const deleteEpisode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("episodes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const CutInput = z.object({
  episode_id: z.string().uuid(),
  cuts: z.array(z.object({
    start_sec: z.number().min(0),
    end_sec: z.number().min(0),
    cut_type: z.enum(["dead_air", "energy_dip", "tangent"]),
    reason: z.string().max(1000),
    accepted: z.boolean().default(true),
  })).max(2000),
});

export const saveCuts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => CutInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Replace all cuts for this episode
    const { error: delErr } = await supabase.from("cuts").delete().eq("episode_id", data.episode_id);
    if (delErr) throw new Error(delErr.message);
    if (data.cuts.length === 0) return { ok: true };
    const rows = data.cuts.map((c) => ({ ...c, episode_id: data.episode_id, user_id: userId }));
    const { error } = await supabase.from("cuts").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateCutAccepted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid(), accepted: z.boolean() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("cuts").update({ accepted: data.accepted }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
