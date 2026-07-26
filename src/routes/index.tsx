import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Sparkles, Waves, Brain, FileDown, Play, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cut Points — the AI co-editor for podcasts & video" },
      { name: "description", content: "Flag dead air, energy dips, and off-topic tangents on one bouncy timeline. Export straight to Premiere, Audacity, and CSV." },
      { property: "og:title", content: "Cut Points — AI co-editor for creators" },
      { property: "og:description", content: "Signal analysis + AI reasoning, together. Every cut suggestion comes with a reason you can verify." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <AppShell>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-24">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] items-center">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              <Sparkles className="h-3 w-3" /> Signal × AI, on one timeline
            </span>
            <h1 className="mt-6 text-5xl md:text-7xl font-display leading-[1.02]">
              The <span className="bg-gradient-primary bg-clip-text text-transparent">bouncy</span><br />
              co-editor for your <span className="bg-gradient-lavender bg-clip-text text-transparent">podcast</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Cut Points listens to your raw recording and reads your transcript. It flags dead air, energy dips, and tangents — each with a reason you can verify. Export straight to your NLE.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" className="btn-bouncy inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-3 font-semibold text-primary-foreground shadow-bouncy">
                Start editing <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/how-it-works" className="btn-bouncy inline-flex items-center gap-2 rounded-full border-2 border-border bg-background/80 px-6 py-3 font-semibold">
                <Play className="h-4 w-4" /> See how it works
              </Link>
            </div>
            <div className="mt-8 flex gap-6 font-mono text-xs text-muted-foreground">
              <span>🎙️ mp3 · wav · m4a</span>
              <span>📝 srt · vtt · txt</span>
              <span>📤 xml · txt · csv</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-gradient-primary opacity-30 blur-2xl" />
            <div className="absolute -bottom-6 -left-6 h-40 w-40 rounded-full bg-gradient-lavender opacity-40 blur-2xl" />
            <div className="relative rounded-3xl bg-card p-6 shadow-bouncy border border-border">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-mono text-xs text-muted-foreground">episode_042.mp3</div>
                <div className="rounded-full bg-accent px-2 py-0.5 font-mono text-xs">42:18 → 34:07</div>
              </div>
              <div className="flex h-24 items-end gap-[2px] rounded-2xl bg-muted p-3">
                {Array.from({ length: 60 }).map((_, i) => {
                  const h = 20 + Math.abs(Math.sin(i * 0.6) * 60) + (i % 7 === 0 ? -30 : 0);
                  return <div key={i} className="flex-1 rounded-full bg-gradient-primary" style={{ height: `${Math.max(4, h)}%`, opacity: i % 11 === 3 ? 0.3 : 1 }} />;
                })}
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { t: "3:24", type: "dead_air", text: "Silent for 4.2s (below −40 dB)", c: "bg-accent" },
                  { t: "12:07", type: "tangent", text: "Drifts into unrelated Star Wars story", c: "bg-secondary" },
                  { t: "27:48", type: "energy_dip", text: "Trails off ~14 dB below rolling avg", c: "bg-primary/20" },
                ].map((f, i) => (
                  <div key={i} className={`flex items-center gap-3 rounded-2xl ${f.c} p-3 text-sm`}>
                    <span className="font-mono text-xs font-bold">{f.t}</span>
                    <span className="rounded-full bg-background/70 px-2 py-0.5 font-mono text-[10px] uppercase">{f.type.replace("_", " ")}</span>
                    <span className="text-xs">{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-4xl font-display">Two signals. One timeline. Zero guessing.</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: Waves, title: "Signal analysis", desc: "Windowed RMS loudness across your whole track. Flags dead air and energy dips — no AI needed for the physics." },
            { icon: Brain, title: "AI reasoning", desc: "Reads your transcript against your one-line topic. Flags tangents with plain-English reasons, grounded to real timestamps." },
            { icon: FileDown, title: "Real exports", desc: "Premiere Pro XML markers, Audacity label track, and CSV. Drops straight into your edit — not a screenshot of a suggestion." },
          ].map((f) => (
            <div key={f.title} className="btn-bouncy rounded-3xl bg-card p-6 shadow-soft border border-border">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-bouncy">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-display">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="rounded-[2.5rem] bg-gradient-primary p-12 text-primary-foreground shadow-bouncy">
          <h2 className="text-4xl md:text-5xl font-display">Cut smarter. Ship faster.</h2>
          <p className="mt-4 opacity-90">Your first episode is ready in under a minute.</p>
          <Link to="/auth" className="btn-bouncy mt-8 inline-flex rounded-full bg-background px-8 py-3 font-semibold text-foreground shadow-bouncy">
            Get started free
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center font-mono text-xs text-muted-foreground">
        Made for creators · Cut Points
      </footer>
    </AppShell>
  );
}
