import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { fetchPartners, fetchSession } from "../lib/api";
import { getLocalIdentity } from "../lib/identity";
import type { MatchRow, PartnerRow, SessionRow } from "../lib/types";

interface UseSessionResult {
  session: SessionRow | null;
  partners: PartnerRow[];
  myPartner: PartnerRow | null;
  otherPartner: PartnerRow | null;
  match: MatchRow | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useSession(sessionId: string | undefined): UseSessionResult {
  const [session, setSession] = useState<SessionRow | null>(null);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [loading, setLoading] = useState(true);

  const identity = sessionId ? getLocalIdentity(sessionId) : null;

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    const [s, p] = await Promise.all([fetchSession(sessionId), fetchPartners(sessionId)]);
    setSession(s);
    setPartners(p);
    if (s?.status === "matched") {
      const { data } = await supabase.from("matches").select("*").eq("session_id", sessionId).maybeSingle();
      setMatch(data as MatchRow | null);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => setSession(payload.new as SessionRow),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "partners", filter: `session_id=eq.${sessionId}` },
        () => {
          fetchPartners(sessionId).then(setPartners);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches", filter: `session_id=eq.${sessionId}` },
        (payload) => setMatch(payload.new as MatchRow),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const myPartner = partners.find((p) => p.id === identity?.partnerId) ?? null;
  const otherPartner = partners.find((p) => p.id !== identity?.partnerId) ?? null;

  return { session, partners, myPartner, otherPartner, match, loading, refresh };
}
