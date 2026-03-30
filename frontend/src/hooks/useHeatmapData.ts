import { useState, useEffect } from "react";
import type { HeatmapData } from "../types/charts";

interface UseHeatmapDataReturn {
  data: HeatmapData | null;
  loading: boolean;
  error: string | null;
}

export const useHeatmapData = (): UseHeatmapDataReturn => {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ timezone: timeZone });
        const response = await fetch(
          `/api/charts/heatmap?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Error fetching heatmap data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};
