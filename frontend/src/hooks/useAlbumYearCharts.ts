import { useState, useEffect } from "react";
import { useDateRange } from "../context/DateRangeContext";
import type { Bucket } from "../types/charts";

interface UseAlbumYearChartReturn {
  data: Bucket[];
  loading: boolean;
  error: string | null;
}

const useEntityAlbumYear = (
  endpoint: string | null,
): UseAlbumYearChartReturn => {
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
        console.error("Error fetching album year data:", err);
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

// Total album year
export const useTotalAlbumYear = (): UseAlbumYearChartReturn => {
  return useEntityAlbumYear("/charts/album-year");
};
