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
