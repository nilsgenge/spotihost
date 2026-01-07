import { useState, useEffect } from "react";

interface DatabaseStats {
  total_entries: number;
}

interface DatabaseStatsResult {
  totalEntries: number;
  formattedEntries: string;
  loading: boolean;
  error: string | null;
}

const useDatabaseStats = (): DatabaseStatsResult => {
  const [totalEntries, setTotalEntries] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

        const response = await fetch(`${API_URL}/database-stats`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: DatabaseStats = await response.json();
        setTotalEntries(data.total_entries);
        setError(null);
      } catch (err) {
        setError("Failed to load database stats");
        console.error("Error fetching database stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formattedEntries = new Intl.NumberFormat('en-US').format(totalEntries);

  return { totalEntries, formattedEntries, loading, error };
};

export default useDatabaseStats;