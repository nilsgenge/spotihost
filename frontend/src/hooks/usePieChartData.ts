import { useState, useEffect } from "react";
import { useDateRange } from "../context/DateRangeContext";
import type { PieBucket, UseBarChartFilters } from "../types/charts";

interface UsePieChartReturn {
  data: PieBucket[];
  loading: boolean;
  error: string | null;
  total: number;
}

const fetchPieData = async (
  endpoint: "skip-rate" | "completion-rate",
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

  const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  const response = await fetch(
    `${API_URL}/charts/${endpoint}?${params.toString()}`,
  );

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

export const useSkipRateData = (
  filters: UseBarChartFilters = {},
): UsePieChartReturn => {
  const { startUtcIso, endUtcIso } = useDateRange();
  const [data, setData] = useState<PieBucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!startUtcIso || !endUtcIso) {
      setData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPieData(
          "skip-rate",
          startUtcIso,
          endUtcIso,
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
    startUtcIso,
    endUtcIso,
    filters.artistId,
    filters.albumId,
    filters.trackId,
  ]);

  return { data, loading, error, total };
};

export const useCompletionRateData = (
  filters: UseBarChartFilters = {},
): UsePieChartReturn => {
  const { startUtcIso, endUtcIso } = useDateRange();
  const [data, setData] = useState<PieBucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!startUtcIso || !endUtcIso) {
      setData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPieData(
          "completion-rate",
          startUtcIso,
          endUtcIso,
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
    startUtcIso,
    endUtcIso,
    filters.artistId,
    filters.albumId,
    filters.trackId,
  ]);

  return { data, loading, error, total };
};
