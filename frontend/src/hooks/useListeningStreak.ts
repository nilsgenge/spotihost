import { useState, useEffect } from "react";

interface UseListeningStreakReturn {
  streak: number;
  loading: boolean;
  error: string | null;
}

export const useListeningStreak = (): UseListeningStreakReturn => {
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchListeningStreak = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const response = await fetch(`${API_URL}/listens/streak`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setStreak(data.streak);
        setError(null);
      } catch (err) {
        console.error("Error fetching listening streak:", err);
        setError("Failed to load streak");
        setStreak(0);
      } finally {
        setLoading(false);
      }
    };

    fetchListeningStreak();
  }, []);

  return { streak, loading, error };
};