import { useState, useEffect } from "react";
import { useDateRange } from "../context/DateRangeContext";
import type { Bucket } from "../types/charts";

interface UseMinutesChartReturn {
  data: Bucket[];
  loading: boolean;
  error: string | null;
}

const useEntityMinutes = (endpoint: string | null): UseMinutesChartReturn => {
  const { selectedRange, startUtcIso, endUtcIso } = useDateRange();
  const [data, setData] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!endpoint || !selectedRange || !startUtcIso || !endUtcIso) {
      setData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          start: startUtcIso,
          end: endUtcIso,
          range_key: selectedRange,
        });

        const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
        const response = await fetch(
          `${API_URL}${endpoint}?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        setData(result.buckets || []);
      } catch (err) {
        console.error("Error fetching chart data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, selectedRange, startUtcIso, endUtcIso]);

  return { data, loading, error };
};

// Total minutes
export const useTotalMinutes = (): UseMinutesChartReturn => {
  return useEntityMinutes("/charts/minutes");
};

// Specific artist
export const useArtistMinutes = (
  artistId: string | null,
): UseMinutesChartReturn => {
  const endpoint = artistId ? `/charts/minutes/artist/${artistId}` : null;
  return useEntityMinutes(endpoint);
};

// Specific album
export const useAlbumMinutes = (
  albumId: string | null,
): UseMinutesChartReturn => {
  const endpoint = albumId ? `/charts/minutes/album/${albumId}` : null;
  return useEntityMinutes(endpoint);
};

// Specific track
export const useTrackMinutes = (
  trackId: string | null,
): UseMinutesChartReturn => {
  const endpoint = trackId ? `/charts/minutes/track/${trackId}` : null;
  return useEntityMinutes(endpoint);
};
