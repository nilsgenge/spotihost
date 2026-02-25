import { useState, useEffect } from "react";
import { useDateRange } from "../context/DateRangeContext";
import type {
  BarChartCategory,
  CategoricalBucket,
  UseBarChartFilters,
} from "../types/charts";

interface UseBarChartReturn {
  data: CategoricalBucket[];
  loading: boolean;
  error: string | null;
  total: number;
}

export const useBarChartData = (
  category: BarChartCategory,
  filters: UseBarChartFilters = {},
): UseBarChartReturn => {
  const { startUtcIso, endUtcIso } = useDateRange();
  const [data, setData] = useState<CategoricalBucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Use wide date range for alltime, otherwise use context dates
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
        const params = new URLSearchParams({
          start: queryStart,
          end: queryEnd,
        });

        if (filters.artistId) params.append("artist_id", filters.artistId);
        if (filters.albumId) params.append("album_id", filters.albumId);
        if (filters.trackId) params.append("track_id", filters.trackId);

        const response = await fetch(
          `/api/charts/plays/categorical/${category}?${params.toString()}`,
        );

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        setData(result.buckets || []);
        setTotal(result.total || 0);
      } catch (err) {
        console.error(`Error fetching ${category} data:`, err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setData([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    category,
    queryStart,
    queryEnd,
    filters.artistId,
    filters.albumId,
    filters.trackId,
    filters.allTime,
  ]);

  return { data, loading, error, total };
};

// Specialized hooks for convenience
export const useDayOfWeekData = (filters?: UseBarChartFilters) =>
  useBarChartData("dayofweek", filters);

export const useMonthData = (filters?: UseBarChartFilters) =>
  useBarChartData("month", filters);

export const useYearData = (filters?: UseBarChartFilters) =>
  useBarChartData("year", filters);
