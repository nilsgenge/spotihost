import { useState, useEffect } from "react";
import { type SimpleTrack } from "../types/types";

interface TopTracksResult {
  topTracks: SimpleTrack[];
  loading: boolean;
  error: string | null;
}

export const useTopTracks = (
  start: string,
  end: string,
  limit: number = 10,
): TopTracksResult => {
  const [topTracks, setTopTracks] = useState<SimpleTrack[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopTracks = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/top/top-tracks?start=${encodeURIComponent(
            start,
          )}&end=${encodeURIComponent(end)}&limit=${limit}`,
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTopTracks(data);
      } catch (err) {
        console.error("Error fetching top tracks:", err);
        setError("Failed to load tracks");
      } finally {
        setLoading(false);
      }
    };

    fetchTopTracks();
  }, [start, end, limit]);

  return { topTracks, loading, error };
};
