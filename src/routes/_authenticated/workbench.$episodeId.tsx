import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getEpisode, updateCutAccepted } from "@/lib/episodes.functions";
import { useMemo, useRef, useState } from "react";
import { Waveform, type WaveMarker } from "@/components/waveform";
import { EpisodeChat } from "@/components/episode-chat";
import { formatTs } from "@/lib/transcript";
import { toPremiereMarkersXML, toAudacityLabels, toCSV, downloadBlob, type CutRow } from "@/lib/exports";
import { Play, Pause, ArrowLeft, Download, FileAudio } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workbench/$episodeId")({
  head: () => ({
    meta: [
      { title: "Workbench — Cut Points" },
      { name: "description", content: "Review flagged cuts on your waveform, accept or reject each, and export your edit list." },
      { property: "og:title", content: "Cut Points workbench" },
      { property: "og:description", content: "Interactive cut review with dual signal + AI reasoning." },
    ],
  }),
  component: Workbench,
});

type Cut = {
  id: string;
  start_sec: number;
  end_sec: number;
  cut_type: "dead_air" | "energy_dip" | "tangent";
  reason: string;
  accepted: boolean;
};

type Segment = { start: number; end: number; text: string };

const TYPE_COLOR: Record<Cut["cut_type"], string> = {
  dead_air: "oklch(0.75 0.18 40)",
  energy_dip: "oklch(0.7 0.22 0)",
  tangent: "oklch(0.75 0.18 300)",
};

const TYPE_LABEL: Record<Cut["cut_type"], string> = {
  dead_air: "Dead air",
  energy_dip: "Energy dip",
  tangent: "Tangent",
};

function Workbench() {
  const { episodeId } = Route.useParams();
  const fetchEp = useServerFn(getEpisode);
  const setAccepted = useServerFn(updateCutAccepted);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["episode", episodeId],
    queryFn: () => fetchEp({ data: { id: episodeId } }),
  });

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [filter, setFilter] = useState<"all" | Cut["cut_type"]>("all");

  const [localCuts, setLocalCuts] = useState<Cut[] | null>(null);
  const cuts: Cut[] = localCuts ?? (data?.cuts as Cut[] | undefined) ?? [];
  const episode = data?.episode;

  const acceptedDur = useMemo(() => cuts.filter((c) => c.accepted).reduce((a, c) => a + (c.end_sec - c.start_sec), 0), [cuts]);
  const newDur = Math.max(0, Number(episode?.duration_seconds ?? 0) - acceptedDur);

  const markers: WaveMarker[] = cuts.map((c) => ({
    start: c.start_sec, end: c.end_sec,
    color: TYPE_COLOR[c.cut_type], accepted: c.accepted,
  }));

  function seek(t: number) {
    setTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
  }

  function pickAudio(f: File | null) {
    if (!f) return;
    setAudioFile(f);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(f));
  }

  async function toggleCut(c: Cut) {
    const next = cuts.map((x) => x.id === c.id ? { ...x, accepted: !x.accepted } : x);
    setLocalCuts(next);
    try {
      await setAccepted({ data: { id: c.id, accepted: !c.accepted } });
    } catch (e) {
      toast.error((e as Error).message);
      setLocalCuts(cuts);
    }
  }

  function doExport(kind: "premiere" | "audacity" | "csv") {
    const rows: CutRow[] = cuts.filter((c) => c.accepted).map((c) => ({
      start_sec: Number(c.start_sec), end_sec: Number(c.end_sec),
      cut_type: c.cut_type, reason: c.reason,
    }));
    const name = (episode?.name ?? "episode").replace(/[^a-z0-9-_]+/gi, "_");
    if (kind === "premiere") downloadBlob(toPremiereMarkersXML(rows, episode?.name ?? name), `${name}_cutpoints.xml`, "application/xml");
    if (kind === "audacity") downloadBlob(toAudacityLabels(rows), `${name}_labels.txt`, "text/plain");
    if (kind === "csv") downloadBlob(toCSV(rows), `${name}_cuts.csv`, "text/csv");
    toast.success(`Exported ${rows.length} cuts`);
  }

  const segments = (episode?.transcript_segments as Segment[] | undefined) ?? [];
  const peaks = (episode?.waveform_peaks as number[] | undefined) ?? [];
  const duration = Number(episode?.duration_seconds ?? 0);
  const visibleCuts = filter === "all" ? cuts : cuts.filter((c) => c.cut_type === filter);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-6">
        {isLoading && <div className="rounded-2xl bg-card p-6">Loading episode…</div>}
        {episode && (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Link to="/dashboard" className="btn-bouncy inline-flex items-center gap-1 rounded-full bg-background px-3 py-1.5 text-sm border border-border">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Link>
                <h1 className="font-display text-3xl">{episode.name}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
                <span className="rounded-full bg-muted px-3 py-1">Original {formatTs(duration)}</span>
                <span className="rounded-full bg-gradient-primary px-3 py-1 text-primary-foreground shadow-bouncy">New {formatTs(newDur)}</span>
                <span className="rounded-full bg-accent px-3 py-1 text-accent-foreground">Saved {formatTs(acceptedDur)}</span>
              </div>
            </div>

            <div className="mb-3 text-sm text-muted-foreground">
              Topic: <span className="font-mono">{episode.topic || "—"}</span>
            </div>

            {/* Playback bar */}
            <div className="mb-4 rounded-3xl bg-card p-4 shadow-soft border border-border">
              <div className="mb-3 flex items-center gap-3">
                <button onClick={togglePlay} disabled={!audioUrl}
                  className="btn-bouncy inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-bouncy disabled:opacity-40">
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
                <div className="font-mono text-sm">{formatTs(time)} / {formatTs(duration)}</div>
                {!audioUrl && (
                  <label className="btn-bouncy ml-auto inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-border bg-muted px-3 py-1.5 text-xs">
                    <FileAudio className="h-3 w-3" /> Load audio for playback
                    <input type="file" accept="audio/*" className="hidden" onChange={(e) => pickAudio(e.target.files?.[0] ?? null)} />
                  </label>
                )}
              </div>
              <Waveform peaks={peaks} duration={duration} currentTime={time} markers={markers} onSeek={seek} />
              {audioUrl && (
                <audio ref={audioRef} src={audioUrl} onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                  onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} className="hidden" />
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              {/* Cut list */}
              <div className="rounded-3xl bg-card p-4 shadow-soft border border-border">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-1">
                    {(["all", "dead_air", "energy_dip", "tangent"] as const).map((f) => (
                      <button key={f} onClick={() => setFilter(f)}
                        className={`btn-bouncy rounded-full px-3 py-1 text-xs font-semibold ${filter === f ? "bg-gradient-primary text-primary-foreground shadow-bouncy" : "bg-muted"}`}>
                        {f === "all" ? "All" : TYPE_LABEL[f]}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => doExport("premiere")} className="btn-bouncy inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"><Download className="h-3 w-3" />Premiere</button>
                    <button onClick={() => doExport("audacity")} className="btn-bouncy inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"><Download className="h-3 w-3" />Audacity</button>
                    <button onClick={() => doExport("csv")} className="btn-bouncy inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"><Download className="h-3 w-3" />CSV</button>
                  </div>
                </div>
                <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                  {visibleCuts.length === 0 && <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">No cuts of this type ✨</div>}
                  {visibleCuts.map((c) => (
                    <div key={c.id} className={`rounded-2xl border-2 p-3 transition-all ${c.accepted ? "border-primary/40 bg-background" : "border-border bg-muted/60 opacity-70"}`}>
                      <div className="flex items-start gap-3">
                        <button onClick={() => seek(Number(c.start_sec))}
                          className="btn-bouncy shrink-0 rounded-xl bg-muted px-2 py-1 font-mono text-xs font-bold">
                          {formatTs(Number(c.start_sec))}
                        </button>
                        <span className="rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
                          style={{ background: TYPE_COLOR[c.cut_type], color: "white" }}>
                          {TYPE_LABEL[c.cut_type]}
                        </span>
                        <span className="ml-auto font-mono text-xs text-muted-foreground">
                          {(Number(c.end_sec) - Number(c.start_sec)).toFixed(1)}s
                        </span>
                      </div>
                      <p className="mt-2 text-sm">{c.reason}</p>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => toggleCut(c)}
                          className={`btn-bouncy rounded-full px-4 py-1 text-xs font-semibold ${c.accepted ? "bg-gradient-primary text-primary-foreground" : "bg-muted"}`}>
                          {c.accepted ? "✓ Accepted — cut" : "Rejected — keep"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="min-h-[520px]">
                <EpisodeChat episodeId={episodeId} segments={segments} onSeek={seek} />
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
