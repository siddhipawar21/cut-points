import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Cut Points" },
      { name: "description", content: "Sign in or create your Cut Points account to start editing." },
      { property: "og:title", content: "Sign in to Cut Points" },
      { property: "og:description", content: "Start flagging cuts on your podcast in seconds." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        toast.success("Account created — check your email if confirmation is required, or sign in below.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-lg items-center justify-center px-6 py-16">
        <div className="w-full rounded-3xl bg-card p-8 shadow-bouncy border border-border animate-bounce-in">
          <div className="mb-6 flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-bouncy">
              <Sparkles className="h-5 w-5" />
            </span>
            <h1 className="font-display text-3xl">{mode === "signin" ? "Welcome back" : "Let's cut some tape"}</h1>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-border bg-input px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-border bg-input px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <button type="submit" disabled={busy}
              className="btn-bouncy w-full rounded-full bg-gradient-primary py-3 font-semibold text-primary-foreground shadow-bouncy disabled:opacity-50">
              {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground">
            {mode === "signin" ? "New here? Create an account →" : "Have an account? Sign in →"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
