import { useState, useEffect } from 'react';

interface UseListenedArtistsReturn {
  artistCount: number;
  previousArtistCount: number;
  loading: boolean;
  error: string | null;
}

export const useListenedArtists = (
  start: string, 
  end: string, 
  timeRange: string
): UseListenedArtistsReturn => {
  const [artistCount, setArtistCount] = useState<number>(0);
  const [previousArtistCount, setPreviousArtistCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchListenedArtists = async (s: string, e: string): Promise<number> => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

        const response = await fetch(
          `${API_URL}/listens/artists?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.artist_count;
      } catch (error) {
        console.error("Error fetching listened artists:", error);
        return 0;
      }
    };

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const startDate = new Date(start);
        const endDate = new Date(end);

        let previousStart: Date, previousEnd: Date;
        
        switch (timeRange) {
          case "1d":
            previousStart = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
            previousEnd = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
            break;
          case "1w":
            previousStart = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            previousEnd = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "4w":
            previousStart = new Date(startDate.getTime() - 28 * 24 * 60 * 60 * 1000);
            previousEnd = new Date(endDate.getTime() - 28 * 24 * 60 * 60 * 1000);
            break;
          case "3m":
            previousStart = new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000);
            previousEnd = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case "6m":
            previousStart = new Date(startDate.getTime() - 182 * 24 * 60 * 60 * 1000);
            previousEnd = new Date(endDate.getTime() - 182 * 24 * 60 * 60 * 1000);
            break;
          case "1y":
            previousStart = new Date(startDate.getTime() - 365 * 24 * 60 * 60 * 1000);
            previousEnd = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            previousStart = startDate;
            previousEnd = endDate;
        }

        const [currentCount, prevCount] = await Promise.all([
            fetchListenedArtists(start, end),
            fetchListenedArtists(previousStart.toISOString(), previousEnd.toISOString())
        ]);

        setArtistCount(currentCount);
        setPreviousArtistCount(prevCount);

      } catch (err) {
        setError("Failed to load artist stats");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [start, end, timeRange]);

  return { artistCount, previousArtistCount, loading, error };
};