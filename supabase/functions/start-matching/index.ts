import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { generateBrief } from "../_shared/claude.ts";
import { fetchTitlePoolWithFallback } from "../_shared/tmdb.ts";

const POOL_SIZE = 30;

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { session_id } = await req.json();
    if (!session_id) return jsonResponse({ error: "session_id is required" }, 400);

    const supabase = serviceClient();

    // Claim the job so only one of the two concurrent partner requests runs it.
    const { data: claimed, error: claimError } = await supabase
      .from("sessions")
      .update({ status: "generating" })
      .eq("id", session_id)
      .eq("status", "collecting")
      .select()
      .maybeSingle();

    if (claimError) throw claimError;
    if (!claimed) {
      return jsonResponse({ ok: true, alreadyStarted: true });
    }

    const { data: partners, error: partnersError } = await supabase
      .from("partners")
      .select("*")
      .eq("session_id", session_id);
    if (partnersError) throw partnersError;

    const partnerA = partners?.find((p) => p.role === "A");
    const partnerB = partners?.find((p) => p.role === "B");
    if (!partnerA?.preferences || !partnerB?.preferences) {
      await supabase.from("sessions").update({ status: "collecting" }).eq("id", session_id);
      return jsonResponse({ error: "Both partners must submit preferences first" }, 400);
    }

    const brief = await generateBrief(partnerA.preferences, partnerB.preferences);
    const pool = await fetchTitlePoolWithFallback(brief, new Set(), POOL_SIZE);
    const titleCatalog: Record<string, unknown> = {};
    for (const t of pool) titleCatalog[t.id] = t;

    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        status: "swiping",
        brief,
        pool,
        seen_title_ids: pool.map((t) => t.id),
        title_catalog: titleCatalog,
        round: 1,
      })
      .eq("id", session_id);
    if (updateError) throw updateError;

    return jsonResponse({ ok: true, brief, pool });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
