import { useState, useEffect } from "react";
import type { AdvancedArtist } from "../types/types";

interface UseArtistDetailsReturn {
  artist: AdvancedArtist | null;
  loading: boolean;
  error: string | null;
}

export const useArtistDetails = (
  spotifyId: string | undefined,
): UseArtistDetailsReturn => {
  const [artist, setArtist] = useState<AdvancedArtist | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!spotifyId) {
      setArtist(null);
      setLoading(false);
      return;
    }

    const fetchArtistDetails = async () => {
      try {
        setLoading(true);

        const response = await fetch(`/api/artist/${spotifyId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Artist not found");
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: AdvancedArtist = await response.json();
        setArtist(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching artist details:", err);
        setError("Failed to load artist details");
        setArtist(null);
      } finally {
        setLoading(false);
      }
    };

    fetchArtistDetails();
  }, [spotifyId]);

  return { artist, loading, error };
};
