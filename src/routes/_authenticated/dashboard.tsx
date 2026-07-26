import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listEpisodes, deleteEpisode } from "@/lib/episodes.functions";
import { UploadDropzone } from "@/components/upload-dropzone";
import { formatTs } from "@/lib/transcript";
import { Trash2, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your episodes — Cut Points" },
      { name: "description", content: "Upload a new episode or reopen a past one." },
      { property: "og:title", content: "Your episodes" },
      { property: "og:description", content: "All your Cut Points sessions." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const listFn = useServerFn(listEpisodes);
  const delFn = useServerFn(deleteEpisode);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["episodes"],
    queryFn: () => listFn(),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 xl:grid-cols-[3fr_2fr]">
          <section className="min-w-0">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-bouncy">
                <Sparkles className="h-4 w-4" />
              </span>
              <h1 className="font-display text-4xl">Cook a new cut list</h1>
            </div>
            <p className="mb-6 text-muted-foreground">Drop your raw audio + transcript, tell us the topic, and we'll do the rest.</p>
            <UploadDropzone onDone={(id) => navigate({ to: "/workbench/$episodeId", params: { episodeId: id } })} />
          </section>

          <aside className="min-w-0">
            <h2 className="mb-4 font-display text-2xl">Recent episodes</h2>
            <div className="space-y-3">
              {isLoading && <div className="rounded-2xl bg-card p-6 text-sm text-muted-foreground">Loading…</div>}
              {data?.length === 0 && (
                <div className="rounded-3xl bg-card p-6 text-sm text-muted-foreground shadow-soft border border-border">
                  No episodes yet. Upload your first one to get started 🎙️
                </div>
              )}
              {data?.map((ep) => (
                <div key={ep.id} className="btn-bouncy group flex items-center justify-between rounded-2xl bg-card p-4 shadow-soft border border-border">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{ep.name}</div>
                    <div className="mt-1 flex gap-3 font-mono text-xs text-muted-foreground">
                      <span>{formatTs(Number(ep.duration_seconds))}</span>
                      <span>{new Date(ep.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete "${ep.name}"?`)) return;
                        await delFn({ data: { id: ep.id } });
                        toast.success("Deleted");
                        refetch();
                      }}
                      className="rounded-full p-2 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <Link to="/workbench/$episodeId" params={{ episodeId: ep.id }}
                      className="btn-bouncy inline-flex items-center gap-1 rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}