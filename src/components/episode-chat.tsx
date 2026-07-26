import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askEpisode, getThreadMessages } from "@/lib/ai.functions";
import { Send, MessageCircle } from "lucide-react";
import { formatTs } from "@/lib/transcript";

type Segment = { start: number; end: number; text: string };
type Msg = { role: string; content: string };

export function EpisodeChat({
  episodeId, segments, onSeek,
}: { episodeId: string; segments: Segment[]; onSeek: (t: number) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const ask = useServerFn(askEpisode);
  const load = useServerFn(getThreadMessages);

  useEffect(() => {
    load({ data: { kind: "episode", episode_id: episodeId } }).then((r) => setMsgs(r.messages));
  }, [episodeId, load]);

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [msgs]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim(); if (!q || busy) return;
    setBusy(true); setMsgs((m) => [...m, { role: "user", content: q }]); setInput("");
    try {
      const r = await ask({ data: { question: q, segments, episode_id: episodeId } });
      setMsgs((m) => [...m, { role: "assistant", content: r.reply }]);
    } catch (err) {
      setMsgs((m) => [...m, { role: "assistant", content: "Error: " + (err as Error).message }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex h-full flex-col rounded-3xl bg-card shadow-soft border border-border overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-gradient-lavender px-4 py-3 text-secondary-foreground">
        <MessageCircle className="h-4 w-4" />
        <span className="font-display text-lg">Ask this episode</span>
      </div>
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.length === 0 && (
          <div className="rounded-2xl bg-muted p-3 text-sm">
            Ask things like <em>"where did we talk about pricing?"</em> — I'll answer with clickable timestamps.
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            <div className={m.role === "user"
              ? "max-w-[80%] rounded-2xl bg-gradient-primary px-3 py-2 text-sm text-primary-foreground"
              : "max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm"}>
              {m.role === "assistant" ? renderWithTs(m.content, onSeek) : m.content}
            </div>
          </div>
        ))}
        {busy && <div className="text-xs text-muted-foreground">thinking…</div>}
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-border p-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
          placeholder="Ask about this episode…"
          className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <button disabled={busy || !input.trim()} className="btn-bouncy inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function renderWithTs(text: string, onSeek: (t: number) => void) {
  const parts: React.ReactNode[] = [];
  const re = /<ts>(\d+(?:\.\d+)?)<\/ts>/g;
  let last = 0; let m: RegExpExecArray | null; let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const t = parseFloat(m[1]);
    parts.push(
      <button key={i++} onClick={() => onSeek(t)}
        className="mx-0.5 rounded-full bg-secondary px-2 py-0.5 font-mono text-xs font-bold text-secondary-foreground hover:bg-primary hover:text-primary-foreground">
        {formatTs(t)}
      </button>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
