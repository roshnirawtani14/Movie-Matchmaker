import type { Brief, Preferences, Title } from "./types.ts";

const MODEL = "gemini-3.6-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const BRIEF_SCHEMA = {
  type: "OBJECT",
  properties: {
    languages: { type: "ARRAY", items: { type: "STRING" } },
    mediaTypes: { type: "ARRAY", items: { type: "STRING", enum: ["movie", "tv"] } },
    minRating: { type: "NUMBER" },
    eraRanges: {
      type: "ARRAY",
      items: { type: "ARRAY", items: { type: "NUMBER" }, minItems: 2, maxItems: 2 },
    },
    includeGenres: { type: "ARRAY", items: { type: "STRING" } },
    excludeGenres: { type: "ARRAY", items: { type: "STRING" } },
    keywords: { type: "ARRAY", items: { type: "STRING" } },
    toneSummary: { type: "STRING" },
  },
  required: [
    "languages",
    "mediaTypes",
    "minRating",
    "eraRanges",
    "includeGenres",
    "excludeGenres",
    "keywords",
    "toneSummary",
  ],
};

async function callGemini(system: string, userPrompt: string): Promise<Brief> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: 1500,
        responseMimeType: "application/json",
        responseSchema: BRIEF_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error(`Gemini returned no content: ${JSON.stringify(data)}`);
  return JSON.parse(text) as Brief;
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
- toneSummary: one warm, specific sentence describing tonight's shared vibe, written for a UI caption (not addressed to the user, third person, e.g. "A gripping, twisty thriller with a slow-burn romance running underneath.").`;

export async function generateBrief(a: Preferences, b: Preferences): Promise<Brief> {
  const prompt = `Partner A preferences:\n${JSON.stringify(a, null, 2)}\n\nPartner B preferences:\n${JSON.stringify(b, null, 2)}`;
  return callGemini(BRIEF_SYSTEM, prompt);
}

const REFINE_SYSTEM = `You are a film-and-TV matchmaking analyst running round 2 for a couple who did not match on round 1. You are given the original brief, and BOTH partners' right-swipe lists (titles each person actually responded to) from round 1. Produce an updated brief that leans harder into whatever genuine overlap showed up in their right-swipes — genres, tone, keywords they both gravitated toward — while staying true to their original hard constraints (language, content type, minimum rating, era).`;

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
  return callGemini(REFINE_SYSTEM, prompt);
}
