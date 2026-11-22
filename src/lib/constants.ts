export const SITE_NAME = "InkVerse";

export const GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Historical",
  "Horror",
  "Isekai",
  "Martial Arts",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Supernatural",
  "Thriller",
] as const;
export type Genre = (typeof GENRES)[number];

export const MANHWA_STATUSES = ["ongoing", "completed", "hiatus"] as const;
export type ManhwaStatus = (typeof MANHWA_STATUSES)[number];

export const STATUS_LABELS: Record<ManhwaStatus, string> = {
  ongoing: "Ongoing",
  completed: "Completed",
  hiatus: "On hiatus",
};

export const USER_ROLES = ["user", "admin"] as const;
export const USER_STATUSES = ["active", "suspended"] as const;

export const SORT_OPTIONS = [
  { value: "popular", label: "Most popular" },
  { value: "latest", label: "Latest updates" },
  { value: "newest", label: "Newest releases" },
  { value: "title", label: "Title (A–Z)" },
] as const;

export const PAGE_SIZE = 24;

/** A chapter counts as completed once the reader has scrolled past this share of it. */
export const COMPLETION_RATIO = 0.9;
