import type { Era, Language, MinRating, Mood } from "./types";

export const MOODS: Mood[] = ["Light & fun", "Intense & gripping", "Scary", "Romantic", "Other"];

export const LANGUAGES: Language[] = ["Hindi", "English", "Tamil", "Telugu", "Kannada", "Any"];

export const MIN_RATINGS: MinRating[] = [6, 7, 8, 9];

export const ERAS: Array<{ value: Era; label: string }> = [
  { value: "Any", label: "Any" },
  { value: "Classic", label: "Classic (pre-2000)" },
  { value: "2000-2020", label: "2000–2020" },
  { value: "Recent", label: "Recent (2021–2026)" },
];

export const DEFAULT_PREFERENCES = {
  moods: [] as Mood[],
  moodText: "",
  languages: [] as Language[],
  contentType: "movies" as const,
  minRating: 7 as MinRating,
  eras: [] as Era[],
};
