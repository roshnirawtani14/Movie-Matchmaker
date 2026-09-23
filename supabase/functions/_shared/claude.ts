import type { Brief, Preferences, Title } from "./types.ts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

async function callClaude(system: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      system,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  return text;
}

function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`No JSON object found in Claude response: ${text}`);
  return JSON.parse(raw.slice(start, end + 1)) as T;
}

const BRIEF_SYSTEM = `You are a film-and-TV matchmaking analyst. Two people are about to watch something together tonight in India. You are given both of their independently-submitted preference profiles. Merge them into a single search brief that a movie database query can execute, while preserving the emotional nuance from their free-text answers.

Rules:
- Only include a language if it appears in EITHER person's selection (or if either selected "Any", include all: hi, en, ta, te, kn).
- mediaTypes: include "tv" only if either person chose "Include series"; otherwise only "movie".
- minRating: use the HIGHER of the two minimums (stricter wins), as a number 6-9.
- eraRanges: union of both people's era selections as [startYear, endYear] pairs. "Classic" = [1950,1999], "2000-2020" = [2000,2020], "Recent" = [2021,2026]. "Any" or no selection = [[1950,2026]].
- includeGenres: TMDB-style genre names (e.g. "Comedy", "Thriller", "Romance", "Horror", "Drama", "Action", "Animation", "Family", "Crime", "Mystery", "Adventure", "Science Fiction") that satisfy BOTH people's moods and free-text descriptions. Find genuine overlap — if their moods conflict (one wants Scary, one wants Romantic), pick genres that can serve both (e.g. Thriller/Mystery/Romance hybrid, or Dark Comedy) rather than just picking one person's list.
- excludeGenres: genres that would clash badly with either person's stated mood (e.g. exclude Horror if someone explicitly wants Light & fun and said nothing suggesting they're open to scares).
- keywords: 5-10 short vibe/tone/theme keywords drawn from BOTH free-text descriptions combined (e.g. "slow burn", "found family", "heist", "one night", "workplace comedy"). These are used to re-rank results, not as a strict filter.
- toneSummary: one warm, specific sentence describing tonight's shared vibe, written for a UI caption (not addressed to the user, third person, e.g. "A gripping, twisty thriller with a slow-burn romance running underneath.").

Respond with ONLY a single JSON object matching this TypeScript type, no prose, no markdown fence:
{
  "languages": string[],
  "mediaTypes": ("movie" | "tv")[],
  "minRating": number,
  "eraRanges": [number, number][],
  "includeGenres": string[],
  "excludeGenres": string[],
  "keywords": string[],
  "toneSummary": string
}`;

export async function generateBrief(a: Preferences, b: Preferences): Promise<Brief> {
  const prompt = `Partner A preferences:\n${JSON.stringify(a, null, 2)}\n\nPartner B preferences:\n${JSON.stringify(b, null, 2)}`;
  const text = await callClaude(BRIEF_SYSTEM, prompt);
  return extractJson<Brief>(text);
}

const REFINE_SYSTEM = `You are a film-and-TV matchmaking analyst running round 2 for a couple who did not match on round 1. You are given the original brief, and BOTH partners' right-swipe lists (titles each person actually responded to) from round 1. Produce an updated brief that leans harder into whatever genuine overlap showed up in their right-swipes — genres, tone, keywords they both gravitated toward — while staying true to their original hard constraints (language, content type, minimum rating, era).

Respond with ONLY a single JSON object of the same shape as before, no prose, no markdown fence:
{
  "languages": string[],
  "mediaTypes": ("movie" | "tv")[],
  "minRating": number,
  "eraRanges": [number, number][],
  "includeGenres": string[],
  "excludeGenres": string[],
  "keywords": string[],
  "toneSummary": string
}`;

export async function refineBrief(
  previousBrief: Brief,
  aLikes: Title[],
  bLikes: Title[],
): Promise<Brief> {
  const prompt = `Original brief:\n${JSON.stringify(previousBrief, null, 2)}\n\nPartner A right-swiped (liked) these in round 1:\n${JSON.stringify(
    aLikes.map((t) => ({ name: t.name, genres: t.genres, synopsis: t.synopsis })),
    null,
    2,
  )}\n\nPartner B right-swiped (liked) these in round 1:\n${JSON.stringify(
    bLikes.map((t) => ({ name: t.name, genres: t.genres, synopsis: t.synopsis })),
    null,
    2,
  )}`;
  const text = await callClaude(REFINE_SYSTEM, prompt);
  return extractJson<Brief>(text);
}
