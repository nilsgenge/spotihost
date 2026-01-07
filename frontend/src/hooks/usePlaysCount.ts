import { useState, useEffect } from 'react';

interface UsePlaysCountReturn {
  listensCount: number;
  previousPlaysCount: number;
  loading: boolean;
  error: string | null;
}

export const usePlaysCount = (
  start: string,
  end: string,
  timeRange: string
): UsePlaysCountReturn => {
  const [listensCount, setListensCount] = useState<number>(0);
  const [previousPlaysCount, setPreviousPlaysCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchListensCount = async (s: string, e: string): Promise<number> => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const response = await fetch(
          `${API_URL}/listens/count?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.plays_count || data.count || 0;
      } catch (error) {
        console.error("Error fetching listened plays:", error);
        return 0;
      }
    };

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const startDate = new Date(start);
        const endDate = new Date(end);

        let previousStart: string, previousEnd: string;
        
        switch (timeRange) {
          case "1d":
            previousStart = new Date(startDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
            previousEnd = new Date(endDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
            break;
          case "1w":
            previousStart = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            previousEnd = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            break;
          case "4w":
            previousStart = new Date(startDate.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();
            previousEnd = new Date(endDate.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();
            break;
          case "3m":
            previousStart = new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
            previousEnd = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
            break;
          case "6m":
            previousStart = new Date(startDate.getTime() - 182 * 24 * 60 * 60 * 1000).toISOString();
            previousEnd = new Date(endDate.getTime() - 182 * 24 * 60 * 60 * 1000).toISOString();
            break;
          case "1y":
            previousStart = new Date(startDate.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
            previousEnd = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
            break;
          default:
            previousStart = start;
            previousEnd = end;
        }

        const [currentCount, prevCount] = await Promise.all([
          fetchListensCount(start, end),
          fetchListensCount(previousStart, previousEnd)
        ]);

        setListensCount(currentCount);
        setPreviousPlaysCount(prevCount);
      } catch (err) {
        setError("Failed to load play stats");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [start, end, timeRange]);

  return { listensCount, previousPlaysCount, loading, error };
};