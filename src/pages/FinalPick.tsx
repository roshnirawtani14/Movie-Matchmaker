import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import { LoadingScene } from "../components/LoadingScene";
import { confirmFinalPick } from "../lib/api";

export default function FinalPick() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const { session, loading } = useSession(sessionId);
  const [picking, setPicking] = useState<string | null>(null);

  if (loading || !session?.final_candidates) {
    return (
      <Shell>
        <LoadingScene label="Narrowing it down to five..." />
      </Shell>
    );
  }

  async function handlePick(titleId: string) {
    const title = session!.final_candidates!.find((t) => t.id === titleId);
    if (!title) return;
    setPicking(titleId);
    try {
      await confirmFinalPick(sessionId, title, session!.round);
      navigate(`/session/${sessionId}/match`, { replace: true });
    } catch (err) {
      console.error(err);
      setPicking(null);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pb-10 pt-8">
      <header className="mb-5 text-center">
        <h1 className="text-2xl font-bold">No match yet — you pick together.</h1>
        <p className="mt-1 text-sm text-white/55">
          These five got the most love across both of you. Talk it over, then tap the one you're
          both in on.
        </p>
      </header>

      <div className="space-y-3">
        {session.final_candidates.map((title) => (
          <button
            key={title.id}
            type="button"
            onClick={() => handlePick(title.id)}
            disabled={picking !== null}
            className="flex w-full gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition-colors hover:border-glow-400/50 disabled:opacity-50"
          >
            {title.posterUrl && (
              <img src={title.posterUrl} alt={title.name} className="h-28 w-20 rounded-lg object-cover" />
            )}
            <div className="flex flex-1 flex-col justify-center">
              <h3 className="font-bold leading-tight">{title.name}</h3>
              <p className="mt-0.5 text-xs text-white/45">
                {title.year} · ★ {title.rating.toFixed(1)} · {title.mediaType === "tv" ? "Series" : "Movie"}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-white/60">{title.synopsis}</p>
              <p className="mt-1 text-[11px] font-medium text-glow-400">
                {title.combinedScore === 2 ? "You both liked this" : "You liked this"}
              </p>
            </div>
            {picking === title.id && <span className="self-center text-sm text-white/50">Picking...</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      {children}
    </div>
  );
}
