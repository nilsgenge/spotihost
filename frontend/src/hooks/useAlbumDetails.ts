import { useState, useEffect } from "react";
import type { AdvancedAlbum } from "../types/types";

interface UseAlbumDetailsReturn {
  album: AdvancedAlbum | null;
  loading: boolean;
  error: string | null;
}

export const useAlbumDetails = (
  spotifyId: string | undefined
): UseAlbumDetailsReturn => {
  const [album, setAlbum] = useState<AdvancedAlbum | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!spotifyId) {
      setAlbum(null);
      setLoading(false);
      return;
    }

    const fetchAlbumDetails = async () => {
      try {
        setLoading(true);

        const API_URL =
          import.meta.env.VITE_API_URL || "http://localhost:8000";

        const response = await fetch(`${API_URL}/album/${spotifyId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Album not found");
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: AdvancedAlbum = await response.json();
        setAlbum(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching album details:", err);
        setError("Failed to load album details");
        setAlbum(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAlbumDetails();
  }, [spotifyId]);

  return { album, loading, error };
};
