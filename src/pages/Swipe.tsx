import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import { SwipeDeck } from "../components/SwipeDeck";
import { LoadingScene } from "../components/LoadingScene";
import { seededShuffle } from "../lib/shuffle";
import { completeRound, recordSwipe } from "../lib/api";
import type { Title } from "../lib/types";

export default function Swipe() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const { session, myPartner, loading } = useSession(sessionId);
  const [finishedRound, setFinishedRound] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;
    if (session.status === "matched") navigate(`/session/${sessionId}/match`, { replace: true });
    if (session.status === "final_pick") navigate(`/session/${sessionId}/final`, { replace: true });
  }, [session, sessionId, navigate]);

  useEffect(() => {
    setFinishedRound(null);
  }, [session?.round]);

  const shuffled: Title[] = useMemo(() => {
    if (!session || !myPartner) return [];
    return seededShuffle(session.pool, `${myPartner.id}-r${session.round}`);
  }, [session?.pool, session?.round, myPartner?.id]);

  if (loading || !session || !myPartner) {
    return (
      <Shell>
        <LoadingScene />
      </Shell>
    );
  }

  if (finishedRound === session.round) {
    return (
      <Shell>
        <h1 className="mb-2 text-xl font-bold">Nice, you're through the deck.</h1>
        <LoadingScene label="Waiting for your partner to finish swiping..." />
      </Shell>
    );
  }

  async function handleSwipe(title: Title, direction: "left" | "right") {
    try {
      await recordSwipe({
        sessionId,
        partnerId: myPartner!.id,
        titleId: title.id,
        direction,
        round: session!.round,
      });
    } catch (err) {
      console.error("swipe failed", err);
    }
  }

  async function handleFinished() {
    setFinishedRound(session!.round);
    try {
      await completeRound(sessionId, myPartner!.id, session!.round);
    } catch (err) {
      console.error("complete-round failed", err);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-6 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Round {session.round} of 2
          </p>
          {session.brief?.toneSummary && (
            <p className="mt-0.5 max-w-[280px] text-sm text-white/60">{session.brief.toneSummary}</p>
          )}
        </div>
      </header>

      <SwipeDeck titles={shuffled} onSwipe={handleSwipe} onFinished={handleFinished} />
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
