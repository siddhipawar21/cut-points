import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Upload, Waves, Brain, ListChecks, FileDown, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How Cut Points works — from raw audio to a real edit list" },
      { name: "description", content: "Walk through the whole flow: upload, dual-signal analysis, review cuts, and export to Premiere, Audacity, or CSV." },
      { property: "og:title", content: "How Cut Points works" },
      { property: "og:description", content: "Signal + AI on one timeline. See the whole flow in under a minute." },
    ],
  }),
  component: HowItWorks,
});

const STEPS = [
  { icon: Upload, title: "1. Upload", body: "Drop your raw audio (mp3/wav/m4a) + transcript (srt/vtt/txt). Add a one-line topic like \"how we scaled our startup to 10 employees\"." },
  { icon: Waves, title: "2. Signal scan", body: "In your browser, we compute windowed RMS loudness across the entire track. Sustained silence becomes dead air; sections 10+ dB below the rolling average become energy dips." },
  { icon: Brain, title: "3. AI tangent scan", body: "The transcript + your topic go to the model. It returns timestamped tangents grounded to real segments — never invented — each with a one-sentence reason." },
  { icon: ListChecks, title: "4. Review", body: "Both signals on one waveform. Accept or reject each cut with a click. Watch your \"new runtime\" tick down live as you approve." },
  { icon: FileDown, title: "5. Export", body: "Download Premiere Pro XML markers, Audacity labels, or CSV. Import into your real NLE and finish the edit." },
  { icon: MessageCircle, title: "6. Ask", body: "Chat with your episode — \"where did we talk about pricing?\" — and jump straight to that moment. Or ask our support bot how anything works." },
];

function HowItWorks() {
  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-6 py-16">
        <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">🎬 The whole flow</span>
        <h1 className="mt-4 text-5xl font-display leading-tight">From raw recording to a real edit list — in about a minute.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Cut Points is the only tool that fuses acoustic signal analysis with AI editorial reasoning. Every suggestion comes with a reason — because we don't trust cuts we can't verify.
        </p>

        <div className="mt-12 space-y-6">
          {STEPS.map((s, i) => (
            <div key={s.title} className={`grid gap-6 items-center md:grid-cols-[80px_1fr] rounded-3xl bg-card p-6 shadow-soft border border-border ${i % 2 === 1 ? "md:ml-16" : "md:mr-16"}`}>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-bouncy">
                <s.icon className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-2xl font-display">{s.title}</h3>
                <p className="mt-1 text-muted-foreground">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-3xl bg-gradient-primary p-8 text-center text-primary-foreground shadow-bouncy">
          <h2 className="font-display text-3xl">Ready to try it on your episode?</h2>
          <Link to="/auth" className="btn-bouncy mt-6 inline-flex rounded-full bg-background px-6 py-3 font-semibold text-foreground shadow-bouncy">
            Sign in and go
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
