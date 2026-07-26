import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supportChat, getThreadMessages } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: string; content: string };

export function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const send = useServerFn(supportChat);
  const load = useServerFn(getThreadMessages);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (open && authed && msgs.length === 0) {
      load({ data: { kind: "support" } }).then((r) => setMsgs(r.messages));
    }
  }, [open, authed, load, msgs.length]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  if (!authed) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || busy) return;
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setInput("");
    try {
      const r = await send({ data: { question: q } });
      setMsgs((m) => [...m, { role: "assistant", content: r.reply }]);
    } catch (err) {
      setMsgs((m) => [...m, { role: "assistant", content: `Sorry — ${(err as Error).message}` }]);
    } finally { setBusy(false); }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="btn-bouncy fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-bouncy animate-float"
          aria-label="Open support chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl bg-card shadow-bouncy animate-bounce-in border border-border">
          <div className="flex items-center justify-between bg-gradient-primary px-4 py-3 text-primary-foreground">
            <div>
              <div className="font-display text-lg leading-tight">Cut Points support</div>
              <div className="text-xs opacity-90">Ask how anything works ✨</div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/20" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.length === 0 && (
              <div className="rounded-2xl bg-muted p-3 text-sm">
                Hi! I'm your Cut Points guide. Ask me things like <em>"how do I export to Premiere?"</em> or <em>"what's an energy dip?"</em>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div className={m.role === "user"
                  ? "max-w-[80%] rounded-2xl bg-gradient-primary px-3 py-2 text-sm text-primary-foreground"
                  : "max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm"}>
                  {m.content}
                </div>
              </div>
            ))}
            {busy && <div className="text-xs text-muted-foreground">thinking…</div>}
          </div>
          <form onSubmit={submit} className="flex gap-2 border-t border-border p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
              placeholder="Ask about Cut Points…"
              className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button disabled={busy || !input.trim()} className="btn-bouncy inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
