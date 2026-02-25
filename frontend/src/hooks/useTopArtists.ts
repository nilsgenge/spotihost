import { useState, useEffect } from "react";
import { type SimpleArtist } from "../types/types";

interface TopArtistsResult {
  topArtists: SimpleArtist[];
  loading: boolean;
  error: string | null;
}

export const useTopArtists = (
  start: string,
  end: string,
  limit: number = 10,
): TopArtistsResult => {
  const [topArtists, setTopArtists] = useState<SimpleArtist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopArtists = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/top/top-artists?start=${encodeURIComponent(
            start,
          )}&end=${encodeURIComponent(end)}&limit=${limit}`,
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
