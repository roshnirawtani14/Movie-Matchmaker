import { useParams, useNavigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import { PlatformLink } from "../components/PlatformLink";
import { LoadingScene } from "../components/LoadingScene";

export default function Match() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const { match, loading } = useSession(sessionId);

  if (loading || !match) {
    return (
      <Shell>
        <LoadingScene label="Sealing the deal..." />
      </Shell>
    );
  }

  const { title, platforms } = match;
  const runtime = title.runtimeMinutes
    ? title.runtimeMinutes >= 60
      ? `${Math.floor(title.runtimeMinutes / 60)}h ${title.runtimeMinutes % 60}m`
      : `${title.runtimeMinutes}m`
    : null;

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pb-10 pt-10">
      <div className="mb-6 text-center">
        <p className="animate-bounce text-5xl">🎉</p>
        <h1 className="mt-2 bg-gradient-to-r from-ember-400 to-glow-400 bg-clip-text text-3xl font-extrabold text-transparent">
          It's a match!
        </h1>
        <p className="mt-1 text-sm text-white/50">You both said yes to this one.</p>
      </div>

      <div className="overflow-hidden rounded-3xl bg-ink-800 shadow-2xl shadow-glow-500/10">
        {title.posterUrl && (
          <img src={title.posterUrl} alt={title.name} className="h-72 w-full object-cover" />
        )}
        <div className="p-5">
          <h2 className="text-2xl font-bold">{title.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/50">
            {title.year && <span>{title.year}</span>}
            {runtime && <span>· {runtime}</span>}
            <span>· {title.mediaType === "tv" ? "Series" : "Movie"}</span>
            <span>· ★ {title.rating.toFixed(1)}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/70">{title.synopsis}</p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/40">
          Watch now in India
        </h3>
        {platforms.length > 0 ? (
          <div className="space-y-2">
            {platforms.map((p) => (
              <PlatformLink key={p.service} platform={p} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
            Not currently streaming on a major Indian platform — worth checking rental/purchase options.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => navigate(`/session/${sessionId}/rate`)}
        className="mt-8 w-full rounded-2xl border border-white/15 bg-white/5 py-3.5 text-sm font-semibold text-white/85 active:scale-[0.98]"
      >
        Rate it after you watch
      </button>
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
