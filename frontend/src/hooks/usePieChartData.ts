import { useState, useEffect } from "react";
import { useDateRange } from "../context/DateRangeContext";
import type {
  PieBucket,
  UseBarChartFilters,
  PieChartEndpoint,
} from "../types/charts";

interface UsePieChartReturn {
  data: PieBucket[];
  loading: boolean;
  error: string | null;
  total: number;
}

const fetchPieData = async (
  endpoint: PieChartEndpoint,
  startUtcIso: string,
  endUtcIso: string,
  filters: UseBarChartFilters,
): Promise<{ segments: PieBucket[]; total: number }> => {
  const params = new URLSearchParams({
    start: startUtcIso,
    end: endUtcIso,
  });

  if (filters.artistId) params.append("artist_id", filters.artistId);
  if (filters.albumId) params.append("album_id", filters.albumId);
  if (filters.trackId) params.append("track_id", filters.trackId);

  const response = await fetch(`/api/charts/${endpoint}?${params.toString()}`);

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

// Generic hook for fetching pie chart data from any endpoint
export const usePieChartData = (
  endpoint: PieChartEndpoint,
  filters: UseBarChartFilters = {},
): UsePieChartReturn => {
  const { startUtcIso, endUtcIso } = useDateRange();
  const [data, setData] = useState<PieBucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const queryStart = filters.allTime ? "1950-01-01T00:00:00Z" : startUtcIso;
  const queryEnd = filters.allTime ? "2099-12-31T23:59:59Z" : endUtcIso;

  useEffect(() => {
    if (!queryStart || !queryEnd) {
      setData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPieData(
          endpoint,
          queryStart,
          queryEnd,
          filters,
        );
        setData(result.segments);
        setTotal(result.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setData([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    endpoint,
    queryStart,
    queryEnd,
    filters.artistId,
    filters.albumId,
    filters.trackId,
    filters.allTime,
  ]);

  return { data, loading, error, total };
};

// Convenience hooks for specific chart types

export const useSkipRateData = (
  filters: UseBarChartFilters = {},
): UsePieChartReturn => usePieChartData("skip-rate", filters);

export const useCompletionRateData = (
  filters: UseBarChartFilters = {},
): UsePieChartReturn => usePieChartData("completion-rate", filters);

export const usePlatformData = (
  filters: UseBarChartFilters = {},
): UsePieChartReturn => usePieChartData("platform", filters);

export const useContextData = (
  filters: UseBarChartFilters = {},
): UsePieChartReturn => usePieChartData("context", filters);
