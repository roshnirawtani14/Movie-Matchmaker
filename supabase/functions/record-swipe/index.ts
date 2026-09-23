import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { getIndianStreamingPlatforms } from "../_shared/streaming.ts";
import type { Title } from "../_shared/types.ts";

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { session_id, partner_id, title_id, direction, round } = await req.json();
    if (!session_id || !partner_id || !title_id || !direction || !round) {
      return jsonResponse({ error: "session_id, partner_id, title_id, direction, round are required" }, 400);
    }

    const supabase = serviceClient();

    const { error: insertError } = await supabase
      .from("swipes")
      .upsert(
        { session_id, partner_id, title_id, direction, round },
        { onConflict: "session_id,partner_id,title_id,round", ignoreDuplicates: true },
      );
    if (insertError) throw insertError;

    // record taste signal for long-term personalisation
    const { data: partner } = await supabase.from("partners").select("viewer_id").eq("id", partner_id).maybeSingle();
    if (partner?.viewer_id) {
      await supabase.from("viewer_taste").upsert(
        {
          viewer_id: partner.viewer_id,
          title_id,
          signal: direction === "right" ? "right_swipe" : "left_swipe",
        },
        { onConflict: "viewer_id,title_id,signal", ignoreDuplicates: true },
      );
    }

    if (direction !== "right") {
      return jsonResponse({ matched: false });
    }

    const { data: opposingRightSwipe } = await supabase
      .from("swipes")
      .select("partner_id")
      .eq("session_id", session_id)
      .eq("round", round)
      .eq("title_id", title_id)
      .eq("direction", "right")
      .neq("partner_id", partner_id)
      .maybeSingle();

    if (!opposingRightSwipe) {
      return jsonResponse({ matched: false });
    }

    const { data: session } = await supabase.from("sessions").select("pool").eq("id", session_id).single();
    const title = (session?.pool as Title[] | null)?.find((t) => t.id === title_id);
    if (!title) throw new Error(`Matched title ${title_id} not found in current pool`);

    // Compute platforms before inserting so the row is complete on arrival — the frontend only
    // subscribes to matches INSERT (not UPDATE) so both screens can reveal the match atomically.
    const platforms = await getIndianStreamingPlatforms(title.imdbId);

    // Unique constraint on matches.session_id guarantees only one client wins this race.
    const { data: matchRow, error: matchError } = await supabase
      .from("matches")
      .insert({ session_id, title_id, title, round, platforms })
      .select()
      .maybeSingle();

    if (matchError) {
      if ((matchError as { code?: string }).code === "23505") {
        const { data: existing } = await supabase.from("matches").select("*").eq("session_id", session_id).single();
        return jsonResponse({ matched: true, match: existing });
      }
      throw matchError;
    }

    await supabase.from("sessions").update({ status: "matched" }).eq("id", session_id);

    for (const pid of [partner_id, opposingRightSwipe.partner_id]) {
      const { data: p } = await supabase.from("partners").select("viewer_id").eq("id", pid).maybeSingle();
      if (p?.viewer_id) {
        await supabase.from("viewer_taste").upsert(
          { viewer_id: p.viewer_id, title_id, title_name: title.name, signal: "matched" },
          { onConflict: "viewer_id,title_id,signal", ignoreDuplicates: true },
        );
      }
    }

    return jsonResponse({ matched: true, match: matchRow });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
