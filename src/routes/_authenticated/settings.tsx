import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getPreferences, updatePreferences, deleteAccount } from "@/lib/preferences.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Cut Points" },
      { name: "description", content: "Tune your default silence threshold, export format, and account settings." },
      { property: "og:title", content: "Cut Points settings" },
      { property: "og:description", content: "Personalize your editing defaults." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const navigate = useNavigate();
  const getFn = useServerFn(getPreferences);
  const saveFn = useServerFn(updatePreferences);
  const delFn = useServerFn(deleteAccount);

  const [silenceDb, setSilenceDb] = useState(-40);
  const [minMs, setMinMs] = useState(800);
  const [fmt, setFmt] = useState<"premiere" | "audacity" | "csv">("premiere");
  const [notif, setNotif] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getFn().then((p) => {
      setSilenceDb(Number(p.silence_threshold_db));
      setMinMs(Number(p.min_silence_ms));
      setFmt(p.default_export_format as "premiere" | "audacity" | "csv");
      setNotif(!!p.email_notifications);
    });
  }, [getFn]);

  async function save() {
    setBusy(true);
    try {
      await saveFn({ data: {
        silence_threshold_db: silenceDb,
        min_silence_ms: minMs,
        default_export_format: fmt,
        email_notifications: notif,
      } });
      toast.success("Saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  async function del() {
    if (!confirm("Delete all your episodes and data? This cannot be undone. (Your login stays active — sign out separately to remove your account.)")) return;
    try {
      await delFn();
      await supabase.auth.signOut();
      toast.success("Data deleted. Signed out.");
      navigate({ to: "/", replace: true });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-4xl">Settings ⚙️</h1>
        <p className="mt-2 text-muted-foreground">Your defaults for new episodes.</p>

        <div className="mt-8 space-y-6">
          <div className="rounded-3xl bg-card p-6 shadow-soft border border-border">
            <h2 className="font-display text-xl">Silence detection</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">Threshold ({silenceDb} dB)</span>
                <input type="range" min={-80} max={-10} step={1} value={silenceDb}
                  onChange={(e) => setSilenceDb(+e.target.value)}
                  className="mt-2 w-full accent-primary" />
                <span className="mt-1 block font-mono text-xs text-muted-foreground">Louder → less flagged</span>
              </label>
              <label className="block">
                <span className="text-sm font-medium">Min silence ({minMs} ms)</span>
                <input type="range" min={200} max={5000} step={100} value={minMs}
                  onChange={(e) => setMinMs(+e.target.value)}
                  className="mt-2 w-full accent-primary" />
                <span className="mt-1 block font-mono text-xs text-muted-foreground">Ignore silences shorter than this</span>
              </label>
            </div>
          </div>

          <div className="rounded-3xl bg-card p-6 shadow-soft border border-border">
            <h2 className="font-display text-xl">Export</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["premiere", "audacity", "csv"] as const).map((f) => (
                <button key={f} onClick={() => setFmt(f)}
                  className={`btn-bouncy rounded-full px-4 py-2 text-sm font-semibold ${fmt === f ? "bg-gradient-primary text-primary-foreground shadow-bouncy" : "bg-muted"}`}>
                  {f === "premiere" ? "Premiere Pro XML" : f === "audacity" ? "Audacity labels" : "CSV"}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-card p-6 shadow-soft border border-border">
            <h2 className="font-display text-xl">Notifications</h2>
            <label className="mt-4 flex items-center gap-3">
              <input type="checkbox" checked={notif} onChange={(e) => setNotif(e.target.checked)} className="h-5 w-5 accent-primary" />
              <span className="text-sm">Email me about product updates</span>
            </label>
          </div>

          <button onClick={save} disabled={busy}
            className="btn-bouncy rounded-full bg-gradient-primary px-8 py-3 font-semibold text-primary-foreground shadow-bouncy disabled:opacity-50">
            {busy ? "Saving…" : "Save settings"}
          </button>

          <div className="rounded-3xl border-2 border-destructive/30 bg-card p-6">
            <h2 className="font-display text-xl text-destructive">Danger zone</h2>
            <p className="mt-2 text-sm text-muted-foreground">Delete all your episodes, cuts, and chat history.</p>
            <button onClick={del} className="btn-bouncy mt-4 rounded-full bg-destructive px-6 py-2 text-sm font-semibold text-destructive-foreground">
              Delete my data
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
