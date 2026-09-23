import type { Platform } from "./types.ts";

// "OTT details" by GoX-ai on RapidAPI (host: ott-details.p.rapidapi.com).
// Looked up by IMDb id: GET /gettitleDetails?imdbid=tt1234567
// Response shape: { ..., streamingAvailability: { country: { IN: [{ platform, url }, ...] } } }
const DEFAULT_HOST = "ott-details.p.rapidapi.com";

const PLATFORM_LABELS: Record<string, string> = {
  netflix: "Netflix",
  amazonprimevideo: "Amazon Prime Video",
  hotstar: "Hotstar",
  voot: "Voot",
  viu: "Viu",
  jiocinema: "Jio Cinema",
  zee5: "Zee5",
  itunes: "Apple iTunes",
  erosnow: "Eros Now",
  play: "Google Play Movies",
  mubi: "Mubi",
  appletvplus: "Apple TV Plus",
  sonyliv: "Sony Liv",
  youtube: "YouTube",
  guidedoc: "GuideDoc",
  netflixkids: "Netflix Kids",
  tubitv: "Tubi TV",
  bookmyshow: "Bookmyshow",
  yupptv: "Yupp TV",
  sunnxt: "Sun Nxt",
  crunchyroll: "Crunchyroll",
  hoichoi: "Hoichoi",
  altbalaji: "Alt Balaji",
  hungamaplay: "Hungama Play",
  curiositystream: "Curiosity Stream",
  tatasky: "Tata Play",
  amazon: "Amazon Prime Video",
  microsoft: "Microsoft Store",
};

function labelFor(platformCode: string): string {
  return PLATFORM_LABELS[platformCode] ?? platformCode.replace(/^\w/, (c) => c.toUpperCase());
}

export async function getIndianStreamingPlatforms(imdbId: string | null): Promise<Platform[]> {
  if (!imdbId) return [];

  const apiKey = Deno.env.get("RAPIDAPI_KEY");
  if (!apiKey) {
    console.error("RAPIDAPI_KEY is not set; skipping streaming lookup");
    return [];
  }
  const host = Deno.env.get("RAPIDAPI_HOST") || DEFAULT_HOST;

  const url = `https://${host}/gettitleDetails?imdbid=${encodeURIComponent(imdbId)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "content-type": "application/json",
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": host,
      },
    });

    if (!res.ok) {
      console.error(`RapidAPI streaming lookup failed ${res.status} for ${imdbId}`);
      return [];
    }

    const data = await res.json();
    const options: Array<{ platform: string; url: string }> =
      data?.streamingAvailability?.country?.IN ?? [];

    const seen = new Set<string>();
    const platforms: Platform[] = [];
    for (const opt of options) {
      if (!opt.platform || seen.has(opt.platform)) continue;
      seen.add(opt.platform);
      platforms.push({
        service: labelFor(opt.platform),
        type: "stream",
        link: opt.url ?? "",
      });
    }
    return platforms;
  } catch (err) {
    console.error("streaming lookup error", err);
    return [];
  }
}
