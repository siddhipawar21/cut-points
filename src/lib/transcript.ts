// Transcript parsing (SRT / VTT / plain). Client-safe.
export type TranscriptSegment = {
  start: number; // sec
  end: number;
  text: string;
};

const timeToSec = (t: string) => {
  // "HH:MM:SS,ms" or "HH:MM:SS.ms"
  const m = t.trim().replace(",", ".").match(/^(\d+):(\d+):(\d+(?:\.\d+)?)$/);
  if (!m) return 0;
  return +m[1] * 3600 + +m[2] * 60 + +m[3];
};

export function parseTranscript(raw: string, filename?: string): TranscriptSegment[] {
  const src = raw.replace(/\r/g, "").trim();
  const ext = (filename ?? "").toLowerCase().split(".").pop() ?? "";
  if (ext === "srt" || /^\d+\s*\n\d{2}:\d{2}:\d{2}[,.]\d+\s*-->/.test(src)) return parseSRT(src);
  if (ext === "vtt" || src.startsWith("WEBVTT")) return parseVTT(src);
  return parsePlain(src);
}

function parseSRT(src: string): TranscriptSegment[] {
  const blocks = src.split(/\n\n+/);
  const out: TranscriptSegment[] = [];
  for (const b of blocks) {
    const lines = b.split("\n").filter(Boolean);
    const tl = lines.find((l) => l.includes("-->"));
    if (!tl) continue;
    const [a, z] = tl.split("-->").map((s) => s.trim());
    const idx = lines.indexOf(tl);
    const text = lines.slice(idx + 1).join(" ").trim();
    if (!text) continue;
    out.push({ start: timeToSec(a), end: timeToSec(z), text });
  }
  return out;
}

function parseVTT(src: string): TranscriptSegment[] {
  const body = src.replace(/^WEBVTT.*?\n/, "");
  return parseSRT(body);
}

function parsePlain(src: string): TranscriptSegment[] {
  // No timestamps. Fake by splitting into ~15-sec chunks by sentence.
  const sentences = src.split(/(?<=[.!?])\s+/).filter(Boolean);
  const out: TranscriptSegment[] = [];
  let t = 0;
  for (const s of sentences) {
    // rough: 3 words/sec
    const words = s.trim().split(/\s+/).length;
    const dur = Math.max(2, words / 3);
    out.push({ start: t, end: t + dur, text: s.trim() });
    t += dur;
  }
  return out;
}

export function segmentsToText(segs: TranscriptSegment[]): string {
  return segs.map((s) => `[${formatTs(s.start)}] ${s.text}`).join("\n");
}

export function formatTs(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
    : `${m}:${String(ss).padStart(2, "0")}`;
}
