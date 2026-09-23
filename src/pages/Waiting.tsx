import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import { QRShare } from "../components/QRShare";
import { LoadingScene } from "../components/LoadingScene";
import { getLocalIdentity } from "../lib/identity";
import { startMatching } from "../lib/api";

export default function Waiting() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const identity = getLocalIdentity(sessionId);
  const { session, myPartner, otherPartner, loading } = useSession(sessionId);

  useEffect(() => {
    if (!session) return;
    if (session.status === "swiping") navigate(`/session/${sessionId}/swipe`, { replace: true });
    if (session.status === "matched") navigate(`/session/${sessionId}/match`, { replace: true });
    if (session.status === "final_pick") navigate(`/session/${sessionId}/final`, { replace: true });
  }, [session, sessionId, navigate]);

  // Belt-and-suspenders: if both submitted but generation was never kicked off
  // (e.g. the tab that submitted second was closed before the fire-and-forget call landed).
  useEffect(() => {
    if (session?.status === "collecting" && myPartner?.submitted_at && otherPartner?.submitted_at) {
      startMatching(sessionId).catch((e) => console.error(e));
    }
  }, [session?.status, myPartner?.submitted_at, otherPartner?.submitted_at, sessionId]);

  if (loading || !identity) {
    return (
      <Shell>
        <LoadingScene label="Loading..." />
      </Shell>
    );
  }

  const joinUrl = `${window.location.origin}/join/${sessionId}`;

  if (identity.role === "A" && !otherPartner) {
    return (
      <Shell>
        <h1 className="mb-1 text-xl font-bold">You're in. Now grab your partner.</h1>
        <p className="mb-6 text-sm text-white/55">
          Have them scan this on their phone, or send them the link.
        </p>
        <QRShare url={joinUrl} />
      </Shell>
    );
  }

  if (otherPartner && !otherPartner.submitted_at) {
    return (
      <Shell>
        <h1 className="mb-2 text-xl font-bold">Your partner's in!</h1>
        <LoadingScene label="Waiting for them to set their mood..." />
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="mb-2 text-xl font-bold">Both moods logged.</h1>
      <LoadingScene />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      {children}
    </div>
  );
}
