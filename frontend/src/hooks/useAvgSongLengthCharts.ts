import { useState, useEffect } from "react";
import { useDateRange } from "../context/DateRangeContext";
import type { Bucket } from "../types/charts";

interface UseAvgSongLengthChartReturn {
  data: Bucket[];
  loading: boolean;
  error: string | null;
}

const useEntityAvgSongLength = (
  endpoint: string | null,
): UseAvgSongLengthChartReturn => {
  const { selectedRange, startUtcIso, endUtcIso, timeZone } = useDateRange();
  const [data, setData] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!endpoint || !selectedRange || !startUtcIso || !endUtcIso) {
      setData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          start: startUtcIso,
          end: endUtcIso,
          range_key: selectedRange,
          timezone: timeZone,
        });

        const response = await fetch(`/api${endpoint}?${params.toString()}`);

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        setData(result.buckets || []);
      } catch (err) {
        console.error("Error fetching avg song length data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, selectedRange, startUtcIso, endUtcIso]);

  return { data, loading, error };
};

// Total average song length
export const useTotalAvgSongLength = (): UseAvgSongLengthChartReturn => {
  return useEntityAvgSongLength("/charts/avg-song-length");
};
