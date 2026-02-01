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
  label: string;
  value: number;
  key: string | number;
}

export interface CategoricalChartResponse {
  buckets: CategoricalBucket[];
  category: BarChartCategory;
  total: number;
}

export interface UseBarChartFilters {
  artistId?: string;
  albumId?: string;
  trackId?: string;
}

export interface PieBucket {
  label: string;
  value: number;
  percentage: number;
  color?: string | undefined;
  [key: string]: any;
}

export interface PieChartResponse {
  segments: PieBucket[];
  total: number;
}
