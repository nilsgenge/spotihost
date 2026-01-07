import { useState, useEffect } from "react";

export interface Album {
  album_id: number;
  name: string;
  cover_url: string;
  listen_count: number;
  artist_name: string;
}

interface TopAlbumsResult {
  topAlbums: Album[];
  loading: boolean;
  error: string | null;
}

export const useTopAlbums = (
  start: string,
  end: string,
  limit: number = 10
): TopAlbumsResult => {
  const [topAlbums, setTopAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopAlbums = async () => {
      setLoading(true);
      setError(null);
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

        const response = await fetch(
          `${API_URL}/top/top-albums?start=${encodeURIComponent(
            start
          )}&end=${encodeURIComponent(end)}&limit=${limit}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTopAlbums(data);
      } catch (err) {
        console.error("Error fetching top albums:", err);
        setError("Failed to load albums");
      } finally {
        setLoading(false);
      }
    };

    fetchTopAlbums();
  }, [start, end, limit]);

  return { topAlbums, loading, error };
};