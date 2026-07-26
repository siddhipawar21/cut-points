import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportError } from "../lib/error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { SupportChatWidget } from "@/components/support-chat-widget";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4">
      <div className="max-w-md rounded-3xl bg-card p-10 text-center shadow-bouncy">
        <div className="text-7xl">🫧</div>
        <h1 className="mt-4 text-4xl font-display">Lost in the timeline</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          That page doesn't exist. Let's get you back.
        </p>
        <Link
          to="/"
          className="btn-bouncy mt-6 inline-flex items-center justify-center rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-bouncy"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4">
      <div className="max-w-md rounded-3xl bg-card p-10 text-center shadow-bouncy">
        <div className="text-6xl">💔</div>
        <h1 className="mt-4 text-2xl font-display">Something popped</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="btn-bouncy inline-flex items-center rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Try again
          </button>
          <a
            href="/"
            className="btn-bouncy inline-flex items-center rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Cut Points — AI co-editor for podcasts & video" },
      { name: "description", content: "Cut Points fuses audio signal analysis with AI to flag dead air, energy dips, and tangents — with reasons you can verify." },
      { property: "og:title", content: "Cut Points — AI co-editor for podcasts & video" },
      { property: "og:description", content: "Flag dead air, energy dips, and off-topic tangents. Export to Premiere, Audacity, and CSV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
     { rel: "icon", href: "/favicon.ico?v=2", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-right" />
      <SupportChatWidget />
    </QueryClientProvider>
  );
}
