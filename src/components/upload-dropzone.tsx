import { useState } from "react";
import { toast } from "sonner";
import { Upload, FileAudio, FileText } from "lucide-react";
import { decodeAudio, analyzeBuffer } from "@/lib/signal-analysis";
import { parseTranscript } from "@/lib/transcript";
import { useServerFn } from "@tanstack/react-start";
import { createEpisode, saveCuts } from "@/lib/episodes.functions";
import { detectTangents } from "@/lib/ai.functions";

export function UploadDropzone({ onDone }: { onDone: (episodeId: string) => void }) {
  const [audio, setAudio] = useState<File | null>(null);
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [transcriptText, setTranscriptText] = useState("");
  const [topic, setTopic] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const create = useServerFn(createEpisode);
  const save = useServerFn(saveCuts);
  const tangents = useServerFn(detectTangents);

  async function run() {
    if (!audio) { toast.error("Add an audio file"); return; }
    let raw = transcriptText.trim();
    if (!raw && transcriptFile) raw = await transcriptFile.text();
    if (!raw) { toast.error("Add a transcript file or paste transcript text"); return; }

    setBusy(true);
    try {
      setStatus("Decoding audio…");
      const buf = await decodeAudio(audio);
      setStatus("Analyzing signal…");
      const { duration, peaks, flags } = analyzeBuffer(buf);

      setStatus("Parsing transcript…");
      const segments = parseTranscript(raw, transcriptFile?.name);

      setStatus("Asking AI for tangents…");
      let tang: Array<{ start: number; end: number; reason: string }> = [];
      try {
        const r = await tangents({ data: { topic, segments } });
        tang = r.tangents;
      } catch (e) {
        toast.error("AI tangent scan failed: " + (e as Error).message);
      }

      setStatus("Saving episode…");
      const ep = await create({ data: {
        name: name.trim() || audio.name.replace(/\.[^.]+$/, ""),
        topic,
        duration_seconds: duration,
        waveform_peaks: peaks,
        transcript_text: raw.slice(0, 500_000),
        transcript_segments: segments.slice(0, 10000),
      } });

      const cuts = [
        ...flags.map((f) => ({ start_sec: f.start, end_sec: f.end, cut_type: f.type as "dead_air" | "energy_dip", reason: f.reason, accepted: true })),
        ...tang.map((t) => ({ start_sec: t.start, end_sec: t.end, cut_type: "tangent" as const, reason: t.reason, accepted: true })),
      ];
      await save({ data: { episode_id: ep.id, cuts } });

      toast.success(`Found ${cuts.length} cut points`);
      onDone(ep.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); setStatus(""); }
  }

  return (
    <div className="rounded-3xl bg-card p-6 sm:p-8 shadow-bouncy border border-border">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex min-h-[190px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/50 p-8 text-center btn-bouncy hover:border-primary">
          <FileAudio className="h-10 w-10 text-primary" />
          <span className="font-semibold text-base">{audio ? audio.name : "Audio file"}</span>
          <span className="font-mono text-xs text-muted-foreground">mp3 · wav · m4a</span>
          <input type="file" accept="audio/*" className="hidden" onChange={(e) => setAudio(e.target.files?.[0] ?? null)} />
        </label>
        <label className="flex min-h-[190px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/50 p-8 text-center btn-bouncy hover:border-primary">
          <FileText className="h-10 w-10 text-primary" />
          <span className="font-semibold text-base">{transcriptFile ? transcriptFile.name : "Transcript file"}</span>
          <span className="font-mono text-xs text-muted-foreground">srt · vtt · txt (or paste below)</span>
          <input type="file" accept=".srt,.vtt,.txt,text/*" className="hidden" onChange={(e) => setTranscriptFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      <textarea placeholder="…or paste your transcript here" value={transcriptText}
        onChange={(e) => setTranscriptText(e.target.value)}
        className="mt-4 h-24 w-full rounded-2xl border border-border bg-input px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input placeholder="Episode name (optional)" value={name} onChange={(e) => setName(e.target.value)}
          className="rounded-2xl border border-border bg-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <input placeholder="What's this episode about? (one line)" value={topic} onChange={(e) => setTopic(e.target.value)}
          className="rounded-2xl border border-border bg-input px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <button onClick={run} disabled={busy}
        className="btn-bouncy mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-3 font-semibold text-primary-foreground shadow-bouncy disabled:opacity-60">
        <Upload className="h-4 w-4" />
        {busy ? status || "Working…" : "Analyze episode"}
      </button>
    </div>
  );
}