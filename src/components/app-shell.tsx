import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, User, Sparkles } from "lucide-react";

export function AppHeader({ hideNav = false }: { hideNav?: boolean }) {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-bouncy">
            <Sparkles className="h-5 w-5" />
          </span>
          Cut Points
        </Link>
        {!hideNav && (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/how-it-works" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>How it works</Link>
            {email && <Link to="/dashboard" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>Episodes</Link>}
            {email && <Link to="/settings" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>Settings</Link>}
          </nav>
        )}
        <div className="flex items-center gap-2">
          {email ? (
            <>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium">
                <User className="h-3 w-3" /> {email}
              </span>
              <button onClick={signOut} className="btn-bouncy inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold">
                <LogOut className="h-3 w-3" /> Sign out
              </button>
            </>
          ) : (
            <Link to="/auth" className="btn-bouncy rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-bouncy">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <AppHeader />
      <main>{children}</main>
    </div>
  );
}
