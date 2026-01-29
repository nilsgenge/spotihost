export type RangeKey = "1d" | "1w" | "4w" | "3m" | "6m" | "1y" | "alltime";

export interface Bucket {
  label: string;
  value: number | null;
  start: string;
  end: string;
}

export interface ChartResponse {
  buckets: Bucket[];
}

export type BarChartCategory = "dayofweek" | "month" | "year";

export interface CategoricalBucket {
  label: string; // Display label (Mon, Jan, 2023)
  value: number; // Always number, 0 if empty
  key: string | number; // Internal key (0-6 for days, 1-12 for months, year for years)
}

export interface CategoricalChartResponse {
  buckets: CategoricalBucket[];
  category: BarChartCategory;
  total: number; // Total plays across all buckets
}

export interface UseBarChartFilters {
  artistId?: string;
  albumId?: string;
  trackId?: string;
}
