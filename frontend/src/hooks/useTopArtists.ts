import { useState, useEffect } from "react";

export interface Artist {
  artist_id: number;
  name: string;
  image_url: string;
  listen_count: number;
}

interface TopArtistsResult {
  topArtists: Artist[];
  loading: boolean;
  error: string | null;
}

export const useTopArtists = (
  start: string,
  end: string,
  limit: number = 10
): TopArtistsResult => {
  const [topArtists, setTopArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopArtists = async () => {
      setLoading(true);
      setError(null);
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

        const response = await fetch(
          `${API_URL}/top/top-artists?start=${encodeURIComponent(
            start
          )}&end=${encodeURIComponent(end)}&limit=${limit}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTopArtists(data);
      } catch (err) {
        console.error("Error fetching top artists:", err);
        setError("Failed to load artists");
      } finally {
        setLoading(false);
      }
    };

    fetchTopArtists();
  }, [start, end, limit]);

  return { topArtists, loading, error };
};