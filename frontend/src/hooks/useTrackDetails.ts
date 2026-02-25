import { useState, useEffect } from "react";
import type { AdvancedTrack } from "../types/types";

interface UseTrackDetailsReturn {
  track: AdvancedTrack | null;
  loading: boolean;
  error: string | null;
}

export const useTrackDetails = (
  spotifyId: string | undefined,
): UseTrackDetailsReturn => {
  const [track, setTrack] = useState<AdvancedTrack | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!spotifyId) {
      setTrack(null);
      setLoading(false);
      return;
    }

    const fetchTrackDetails = async () => {
      try {
        setLoading(true);

        const response = await fetch(`/api/track/${spotifyId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Track not found");
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: AdvancedTrack = await response.json();
        setTrack(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching track details:", err);
        setError("Failed to load track details");
        setTrack(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTrackDetails();
  }, [spotifyId]);

  return { track, loading, error };
};
