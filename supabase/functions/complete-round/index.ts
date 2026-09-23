import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { refineBrief } from "../_shared/gemini.ts";
import { fetchTitlePoolWithFallback } from "../_shared/tmdb.ts";
import { getIndianStreamingPlatforms } from "../_shared/streaming.ts";
import type { Title } from "../_shared/types.ts";

const POOL_SIZE = 30;
const FINAL_PICK_COUNT = 5;

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { session_id, partner_id, round } = await req.json();
    if (!session_id || !partner_id || !round) {
      return jsonResponse({ error: "session_id, partner_id, round are required" }, 400);
    }

    const supabase = serviceClient();

    await supabase
      .from("partners")
      .update({ completed_round: round })
      .eq("id", partner_id)
      .lt("completed_round", round);

    const { data: session } = await supabase.from("sessions").select("*").eq("id", session_id).single();
    if (!session) return jsonResponse({ error: "session not found" }, 404);

    if (session.status !== "swiping" || session.round !== round) {
      return jsonResponse({ ok: true, status: session.status, round: session.round });
    }

    const { data: partners } = await supabase.from("partners").select("*").eq("session_id", session_id);
    const bothDone = (partners ?? []).length === 2 && (partners ?? []).every((p) => p.completed_round >= round);
    if (!bothDone) {
      return jsonResponse({ ok: true, status: "swiping", round, waitingOnPartner: true });
    }

    if (round === 1) {
      const { data: claimed } = await supabase
        .from("sessions")
        .update({ status: "refining" })
        .eq("id", session_id)
        .eq("status", "swiping")
        .eq("round", 1)
        .select()
        .maybeSingle();
      if (!claimed) return jsonResponse({ ok: true, status: "already_progressed" });

      const { data: swipes } = await supabase
        .from("swipes")
        .select("*")
        .eq("session_id", session_id)
        .eq("round", 1)
        .eq("direction", "right");

      const catalog = (session.title_catalog ?? {}) as Record<string, Title>;
      const [partnerA, partnerB] = partners!.sort((x, y) => (x.role < y.role ? -1 : 1));
      const likesFor = (pid: string) =>
        (swipes ?? [])
          .filter((s) => s.partner_id === pid)
          .map((s) => catalog[s.title_id])
          .filter(Boolean) as Title[];

      const refined = await refineBrief(session.brief, likesFor(partnerA.id), likesFor(partnerB.id));
      const seen = new Set<string>(session.seen_title_ids ?? []);
      const newPool = await fetchTitlePoolWithFallback(refined, seen, POOL_SIZE);
      const newCatalog = { ...catalog };
      for (const t of newPool) newCatalog[t.id] = t;

      await supabase
        .from("sessions")
        .update({
          status: "swiping",
          round: 2,
          brief: refined,
          pool: newPool,
          seen_title_ids: [...seen, ...newPool.map((t) => t.id)],
          title_catalog: newCatalog,
        })
        .eq("id", session_id);

      return jsonResponse({ ok: true, status: "swiping", round: 2 });
    }

    // round === 2, still no match -> combined-score top 5, both partners pick together
    const { data: claimed } = await supabase
      .from("sessions")
      .update({ status: "final_pick" })
      .eq("id", session_id)
      .eq("status", "swiping")
      .eq("round", 2)
      .select()
      .maybeSingle();
    if (!claimed) return jsonResponse({ ok: true, status: "already_progressed" });

    const { data: allSwipes } = await supabase
      .from("swipes")
      .select("*")
      .eq("session_id", session_id)
      .eq("direction", "right");

    const score = new Map<string, number>();
    for (const s of allSwipes ?? []) score.set(s.title_id, (score.get(s.title_id) ?? 0) + 1);

    const catalog = (session.title_catalog ?? {}) as Record<string, Title>;
    const titleById = new Map<string, Title>(Object.entries(catalog));

    const ranked = [...score.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, FINAL_PICK_COUNT)
      .map(([titleId, combinedScore]) => ({ title: titleById.get(titleId), combinedScore }))
      .filter((r) => r.title) as Array<{ title: Title; combinedScore: number }>;

    const finalCandidates = await Promise.all(
      ranked.map(async (r) => ({
        ...r.title,
        combinedScore: r.combinedScore,
        platforms: await getIndianStreamingPlatforms(r.title.imdbId),
      })),
    );

    await supabase.from("sessions").update({ final_candidates: finalCandidates }).eq("id", session_id);

    return jsonResponse({ ok: true, status: "final_pick", finalCandidates });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
