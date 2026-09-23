import type { Brief, Title } from "./types.ts";

const TMDB_API = "https://api.themoviedb.org/3";

const LANGUAGE_CODES: Record<string, string> = {
  hindi: "hi",
  english: "en",
  tamil: "ta",
  telugu: "te",
  kannada: "kn",
};

export function languageNameToCode(name: string): string {
  return LANGUAGE_CODES[name.toLowerCase()] ?? name.toLowerCase();
}

const MOVIE_GENRES: Record<string, number> = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  "science fiction": 878,
  "sci-fi": 878,
  thriller: 53,
  war: 10752,
  western: 37,
};

const TV_GENRES: Record<string, number> = {
  action: 10759,
  "action & adventure": 10759,
  adventure: 10759,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 10765,
  "sci-fi": 10765,
  "science fiction": 10765,
  "sci-fi & fantasy": 10765,
  horror: 9648,
  mystery: 9648,
  romance: 10749,
  thriller: 9648,
  war: 10768,
  western: 37,
};

function genreIds(names: string[], map: Record<string, number>): number[] {
  const ids = new Set<number>();
  for (const name of names) {
    const id = map[name.toLowerCase().trim()];
    if (id) ids.add(id);
  }
  return [...ids];
}

function tmdbHeaders() {
  const key = Deno.env.get("TMDB_API_KEY");
  if (!key) throw new Error("TMDB_API_KEY is not set");
  return {
    accept: "application/json",
    authorization: `Bearer ${key}`,
  };
}

async function tmdbGet(path: string, params: Record<string, string>) {
  const url = new URL(`${TMDB_API}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: tmdbHeaders() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TMDB error ${res.status} on ${path}: ${body}`);
  }
  return res.json();
}

interface DiscoverRow {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  overview: string;
  poster_path: string | null;
  genre_ids: number[];
  original_language: string;
  popularity: number;
}

async function discover(
  mediaType: "movie" | "tv",
  language: string,
  minRating: number,
  era: [number, number],
  includeIds: number[],
  excludeIds: number[],
  page: number,
): Promise<DiscoverRow[]> {
  const dateField = mediaType === "movie" ? "primary_release_date" : "first_air_date";
  const params: Record<string, string> = {
    sort_by: "popularity.desc",
    "vote_average.gte": String(minRating),
    "vote_count.gte": "30",
    with_original_language: language,
    watch_region: "IN",
    [`${dateField}.gte`]: `${era[0]}-01-01`,
    [`${dateField}.lte`]: `${era[1]}-12-31`,
    page: String(page),
  };
  if (includeIds.length) params.with_genres = includeIds.join("|");
  if (excludeIds.length) params.without_genres = excludeIds.join(",");

  const data = await tmdbGet(`/discover/${mediaType}`, params);
  return data.results ?? [];
}

async function fetchDetail(mediaType: "movie" | "tv", id: number) {
  return tmdbGet(`/${mediaType}/${id}`, { append_to_response: "external_ids" });
}

function toTitleStub(row: DiscoverRow, mediaType: "movie" | "tv"): Omit<Title, "runtimeMinutes" | "imdbId"> {
  const dateStr = mediaType === "movie" ? row.release_date : row.first_air_date;
  const year = dateStr ? Number(dateStr.slice(0, 4)) : null;
  return {
    id: `${mediaType}-${row.id}`,
    tmdbId: row.id,
    mediaType,
    name: (row.title ?? row.name ?? "Untitled") as string,
    year,
    rating: Math.round(row.vote_average * 10) / 10,
    synopsis: (row.overview || "").trim(),
    posterUrl: row.poster_path ? `https://image.tmdb.org/t/p/w500${row.poster_path}` : null,
    genres: [],
    originalLanguage: row.original_language,
  };
}

/**
 * Pulls a pool of titles from TMDB satisfying the brief, round-robining across
 * languages/eras so the pool isn't dominated by whichever combo is most popular,
 * then enriches the chosen ones with runtime + full genre names.
 */
export async function fetchTitlePool(
  brief: Brief,
  excludeTitleIds: Set<string>,
  targetCount: number,
): Promise<Title[]> {
  const languages = brief.languages.length ? brief.languages.map(languageNameToCode) : ["hi", "en"];
  const mediaTypes = brief.mediaTypes.length ? brief.mediaTypes : ["movie"];
  const eras = brief.eraRanges.length ? brief.eraRanges : [[1950, 2026] as [number, number]];

  const buckets: Array<{ mediaType: "movie" | "tv"; rows: DiscoverRow[] }> = [];
  const seenIds = new Set<string>();

  for (const mediaType of mediaTypes) {
    const includeIds = genreIds(brief.includeGenres, mediaType === "movie" ? MOVIE_GENRES : TV_GENRES);
    const excludeIds = genreIds(brief.excludeGenres, mediaType === "movie" ? MOVIE_GENRES : TV_GENRES);

    for (const language of languages) {
      for (const era of eras as Array<[number, number]>) {
        const rows: DiscoverRow[] = [];
        try {
          const page1 = await discover(mediaType, language, brief.minRating, era, includeIds, excludeIds, 1);
          for (const row of page1) {
            const id = `${mediaType}-${row.id}`;
            if (seenIds.has(id) || excludeTitleIds.has(id)) continue;
            seenIds.add(id);
            rows.push(row);
          }
        } catch (err) {
          console.error("discover failed", mediaType, language, era, err);
        }
        buckets.push({ mediaType, rows });
      }
    }
  }

  // Round-robin across buckets so the pool represents every language/era combo, not just the biggest one.
  const picked: Array<{ row: DiscoverRow; mediaType: "movie" | "tv" }> = [];
  let cursor = 0;
  while (picked.length < targetCount && buckets.some((b) => b.rows.length > 0)) {
    for (let i = 0; i < buckets.length && picked.length < targetCount; i++) {
      const bucket = buckets[i];
      if (bucket.rows.length === 0) continue;
      const row = bucket.rows.shift()!;
      picked.push({ row, mediaType: bucket.mediaType });
    }
    cursor++;
    if (cursor > 10) break;
  }

  const genreNameLookup = (mediaType: "movie" | "tv") => {
    const map = mediaType === "movie" ? MOVIE_GENRES : TV_GENRES;
    const reverse: Record<number, string> = {};
    for (const [name, id] of Object.entries(map)) if (!(id in reverse)) reverse[id] = name;
    return reverse;
  };

  const enriched = await Promise.all(
    picked.map(async ({ row, mediaType }) => {
      try {
        const detail = await fetchDetail(mediaType, row.id);
        const stub = toTitleStub(row, mediaType);
        const runtime =
          mediaType === "movie" ? detail.runtime ?? null : (detail.episode_run_time?.[0] ?? null);
        const genreNames: string[] = (detail.genres ?? []).map((g: { name: string }) => g.name);
        const imdbId: string | null = detail.external_ids?.imdb_id ?? detail.imdb_id ?? null;
        return { ...stub, runtimeMinutes: runtime, genres: genreNames, imdbId } as Title;
      } catch (err) {
        console.error("detail fetch failed", mediaType, row.id, err);
        const reverse = genreNameLookup(mediaType);
        const stub = toTitleStub(row, mediaType);
        return {
          ...stub,
          runtimeMinutes: null,
          imdbId: null,
          genres: row.genre_ids.map((id) => reverse[id]).filter(Boolean) as string[],
        } as Title;
      }
    }),
  );

  return enriched.filter((t) => t.synopsis && t.posterUrl);
}

/**
 * Same as fetchTitlePool, but if the brief is narrow enough to starve the pool
 * (e.g. 9+ rating combined with a less-common language), progressively relaxes
 * the rating floor and era range rather than showing an empty deck.
 */
export async function fetchTitlePoolWithFallback(
  brief: Brief,
  excludeTitleIds: Set<string>,
  targetCount: number,
): Promise<Title[]> {
  let current = brief;
  let results = await fetchTitlePool(current, excludeTitleIds, targetCount);

  for (let attempt = 0; attempt < 2 && results.length < Math.min(10, targetCount); attempt++) {
    current = {
      ...current,
      minRating: Math.max(5, current.minRating - 1),
      eraRanges: [[1950, 2026]],
    };
    const seen = new Set([...excludeTitleIds, ...results.map((t) => t.id)]);
    const more = await fetchTitlePool(current, seen, targetCount - results.length);
    results = [...results, ...more];
  }

  return results;
}
