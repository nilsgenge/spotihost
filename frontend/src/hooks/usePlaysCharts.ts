import { useState, useEffect } from "react";
import { useDateRange } from "../context/DateRangeContext";
import type { Bucket } from "../types/charts";

interface UsePlaysChartReturn {
  data: Bucket[];
  loading: boolean;
  error: string | null;
}

const useEntityPlays = (endpoint: string | null): UsePlaysChartReturn => {
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

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        setData(result.buckets || []);
      } catch (err) {
        console.error("Error fetching plays data:", err);
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

// Total plays
export const useTotalPlays = (): UsePlaysChartReturn => {
  return useEntityPlays("/charts/plays");
};

// Specific plays
export const useArtistPlays = (
  artistId: string | null,
): UsePlaysChartReturn => {
  const endpoint = artistId ? `/charts/plays/artist/${artistId}` : null;
  return useEntityPlays(endpoint);
};

export const useAlbumPlays = (albumId: string | null): UsePlaysChartReturn => {
  const endpoint = albumId ? `/charts/plays/album/${albumId}` : null;
  return useEntityPlays(endpoint);
};

export const useTrackPlays = (trackId: string | null): UsePlaysChartReturn => {
  const endpoint = trackId ? `/charts/plays/track/${trackId}` : null;
  return useEntityPlays(endpoint);
};
