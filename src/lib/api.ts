import { supabase, FUNCTIONS_BASE } from "./supabaseClient";
import { getViewerId, getLocalIdentity, setLocalIdentity } from "./identity";
import type { MatchRow, PartnerRow, Preferences, SessionRow, Title } from "./types";

async function callFunction<T>(name: string, body: unknown): Promise<T> {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `${name} failed`);
  return data as T;
}

export async function createSessionAsPartnerA(): Promise<string> {
  const { data: session, error } = await supabase
    .from("sessions")
    .insert({ status: "collecting" })
    .select()
    .single();
  if (error) throw error;

  const { data: partner, error: partnerError } = await supabase
    .from("partners")
    .insert({ session_id: session.id, role: "A", viewer_id: getViewerId() })
    .select()
    .single();
  if (partnerError) throw partnerError;

  setLocalIdentity(session.id, { partnerId: partner.id, role: "A" });
  return session.id as string;
}

export type JoinResult =
  | { ok: true; alreadyKnown: boolean }
  | { ok: false; reason: "not_found" | "full" };

export async function joinSessionAsPartnerB(sessionId: string): Promise<JoinResult> {
  const existing = getLocalIdentity(sessionId);
  if (existing) return { ok: true, alreadyKnown: true };

  const { data: session } = await supabase.from("sessions").select("id").eq("id", sessionId).maybeSingle();
  if (!session) return { ok: false, reason: "not_found" };

  const { data: partners } = await supabase.from("partners").select("role").eq("session_id", sessionId);
  if ((partners ?? []).some((p) => p.role === "B")) {
    return { ok: false, reason: "full" };
  }

  const { data: partner, error } = await supabase
    .from("partners")
    .insert({ session_id: sessionId, role: "B", viewer_id: getViewerId() })
    .select()
    .single();
  if (error) {
    // race: someone else grabbed the B slot between our check and insert
    return { ok: false, reason: "full" };
  }

  setLocalIdentity(sessionId, { partnerId: partner.id, role: "B" });
  return { ok: true, alreadyKnown: false };
}

export async function submitPreferences(partnerId: string, preferences: Preferences): Promise<void> {
  const { error } = await supabase
    .from("partners")
    .update({ preferences, submitted_at: new Date().toISOString() })
    .eq("id", partnerId);
  if (error) throw error;
}

export async function fetchSession(sessionId: string): Promise<SessionRow | null> {
  const { data } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
  return data as SessionRow | null;
}

export async function fetchPartners(sessionId: string): Promise<PartnerRow[]> {
  const { data } = await supabase.from("partners").select("*").eq("session_id", sessionId);
  return (data ?? []) as PartnerRow[];
}

export async function startMatching(sessionId: string): Promise<void> {
  await callFunction("start-matching", { session_id: sessionId });
}

export async function recordSwipe(params: {
  sessionId: string;
  partnerId: string;
  titleId: string;
  direction: "left" | "right";
  round: number;
}): Promise<{ matched: boolean; match?: MatchRow }> {
  return callFunction("record-swipe", {
    session_id: params.sessionId,
    partner_id: params.partnerId,
    title_id: params.titleId,
    direction: params.direction,
    round: params.round,
  });
}

export async function completeRound(sessionId: string, partnerId: string, round: number): Promise<void> {
  await callFunction("complete-round", { session_id: sessionId, partner_id: partnerId, round });
}

export async function confirmFinalPick(
  sessionId: string,
  candidate: Title & { combinedScore: number; platforms: unknown },
  round: number,
): Promise<void> {
  const { combinedScore: _combinedScore, platforms, ...title } = candidate;
  const { error } = await supabase.from("matches").insert({
    session_id: sessionId,
    title_id: title.id,
    title,
    platforms,
    round,
  });
  if (error && (error as { code?: string }).code !== "23505") throw error;
  await supabase.from("sessions").update({ status: "matched" }).eq("id", sessionId);
}

export async function submitRating(
  sessionId: string,
  partnerId: string,
  titleId: string,
  rating: number,
  notes: string,
): Promise<void> {
  const { error } = await supabase
    .from("ratings")
    .upsert(
      { session_id: sessionId, partner_id: partnerId, title_id: titleId, rating, notes },
      { onConflict: "session_id,partner_id,title_id" },
    );
  if (error) throw error;

  const { data: partner } = await supabase.from("partners").select("viewer_id").eq("id", partnerId).maybeSingle();
  if (partner?.viewer_id) {
    await supabase.from("viewer_taste").upsert(
      { viewer_id: partner.viewer_id, title_id: titleId, rating, signal: "rated" },
      { onConflict: "viewer_id,title_id,signal" },
    );
  }
}

export async function fetchRatings(sessionId: string) {
  const { data } = await supabase.from("ratings").select("*").eq("session_id", sessionId);
  return data ?? [];
}
