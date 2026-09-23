export type Mood = "Light & fun" | "Intense & gripping" | "Scary" | "Romantic" | "Other";
export type Language = "Hindi" | "English" | "Tamil" | "Telugu" | "Kannada" | "Any";
export type ContentType = "movies" | "series";
export type MinRating = 6 | 7 | 8 | 9;
export type Era = "Any" | "Classic" | "2000-2020" | "Recent";

export interface Preferences {
  moods: Mood[];
  moodText?: string;
  languages: Language[];
  contentType: ContentType;
  minRating: MinRating;
  eras: Era[];
}

export interface Brief {
  languages: string[]; // ISO 639-1 codes
  mediaTypes: ("movie" | "tv")[];
  minRating: number;
  eraRanges: Array<[number, number]>;
  includeGenres: string[]; // TMDB genre names
  excludeGenres: string[];
  keywords: string[]; // free-text vibe keywords for scoring/ranking
  toneSummary: string;
}

export interface Title {
  id: string; // "movie-603" | "tv-1399"
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
  type: string; // subscription | rent | buy | free
  link: string;
  logo?: string | null;
}
