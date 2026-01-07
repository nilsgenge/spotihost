import { useState, useEffect } from "react";

export interface Track {
  track_id: number;
  name: string;
  cover_url: string;
  listen_count: number;
  artist_name: string;
}

interface TopTracksResult {
  topTracks: Track[];
  loading: boolean;
  error: string | null;
}

export const useTopTracks = (
  start: string,
  end: string,
  limit: number = 10
): TopTracksResult => {
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopTracks = async () => {
      setLoading(true);
      setError(null);
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

        const response = await fetch(
          `${API_URL}/top/top-tracks?start=${encodeURIComponent(
            start
          )}&end=${encodeURIComponent(end)}&limit=${limit}`
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