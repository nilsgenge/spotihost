import { useState, useEffect } from 'react';

interface UseMinutesListenedReturn {
  value: number;
  loading: boolean;
  error: string | null;
}

export const useMinutesListened = (
  start: string, 
  end: string
): UseMinutesListenedReturn => {
  const [minutesListened, setMinutesListened] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMinutesListened = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

      const response = await fetch(
        `${API_URL}/listens/minutes?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      setMinutesListened(data.minutes_listened || 0);
      setError(null);
    } catch (err) {
      console.error("Error fetching minutes listened:", err);
      setError("Failed to load minutes listened");
      setMinutesListened(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMinutesListened();
  }, [start, end]);

  return { value: minutesListened, loading, error };
};