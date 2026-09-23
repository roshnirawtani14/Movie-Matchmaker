export type Mood = "Light & fun" | "Intense & gripping" | "Scary" | "Romantic" | "Other";
export type Language = "Hindi" | "English" | "Tamil" | "Telugu" | "Kannada" | "Any";
export type ContentType = "movies" | "series";
export type MinRating = 6 | 7 | 8 | 9;
export type Era = "Any" | "Classic" | "2000-2020" | "Recent";

export interface Preferences {
  moods: Mood[];
  moodText: string;
  languages: Language[];
  contentType: ContentType;
  minRating: MinRating;
  eras: Era[];
}

export interface Brief {
  languages: string[];
  mediaTypes: ("movie" | "tv")[];
  minRating: number;
  eraRanges: Array<[number, number]>;
  includeGenres: string[];
  excludeGenres: string[];
  keywords: string[];
  toneSummary: string;
}

export interface Title {
  id: string;
  tmdbId: number;
  imdbId: string | null;
  mediaType: "movie" | "tv";
  name: string;
  year: number | null;
  rating: number;
  runtimeMinutes: number | null;
  synopsis: string;
  posterUrl: string | null;
  genres: string[];
  originalLanguage: string;
}

export interface Platform {
  service: string;
  type: string;
  link: string;
  logo?: string | null;
}

export type SessionStatus =
  | "collecting"
  | "generating"
  | "swiping"
  | "refining"
  | "final_pick"
  | "matched"
  | "completed";

export interface SessionRow {
  id: string;
  status: SessionStatus;
  round: number;
  brief: Brief | null;
  pool: Title[];
  seen_title_ids: string[];
  title_catalog: Record<string, Title>;
  final_candidates: Array<Title & { combinedScore: number; platforms: Platform[] }> | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerRow {
  id: string;
  session_id: string;
  role: "A" | "B";
  viewer_id: string | null;
  preferences: Preferences | null;
  submitted_at: string | null;
  completed_round: number;
  created_at: string;
}

export interface MatchRow {
  id: string;
  session_id: string;
  title_id: string;
  title: Title;
  platforms: Platform[];
  round: number;
  matched_at: string;
}
