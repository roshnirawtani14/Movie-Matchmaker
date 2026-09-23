import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { joinSessionAsPartnerB } from "../lib/api";

export default function Join() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"joining" | "not_found" | "full" | "error">("joining");

  useEffect(() => {
    let cancelled = false;
    joinSessionAsPartnerB(sessionId)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          navigate(`/session/${sessionId}/preferences`, { replace: true });
        } else {
          setStatus(result.reason);
        }
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate]);

  if (status === "joining") {
    return (
      <Centered>
        <div className="mb-3 animate-pulse text-4xl">🎬</div>
        <p className="text-white/70">Joining movie night...</p>
      </Centered>
    );
  }

  if (status === "not_found") {
    return (
      <Centered>
        <p className="text-white/70">This invite doesn't exist anymore. Ask your partner for a fresh link.</p>
      </Centered>
    );
  }

  if (status === "full") {
    return (
      <Centered>
        <p className="text-white/70">
          This movie night already has two people in it. If that's not you, ask for a new invite.
        </p>
      </Centered>
    );
  }

  return (
    <Centered>
      <p className="text-white/70">Something went wrong joining. Try the link again.</p>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      {children}
    </div>
  );
}
