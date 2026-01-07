import { useState, useEffect } from "react";
import { useDateRange } from "../context/DateRangeContext";

export interface Listen {
  listen_id: number;
  track_id: number;
  played_at: string;
  formatted_time: string;
  track_name: string;
  artist_names: string;
  cover_url?: string;
}

interface RecentListensResult {
  listens: Listen[];
  loading: boolean;
  error: string | null;
}

export const useRecentListens = (
  limit: number = 50
): RecentListensResult => {
  const [listens, setListens] = useState<Listen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { timeZone } = useDateRange();

  useEffect(() => {
    if (!timeZone) return;

    const fetchRecentListens = async () => {
      setLoading(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

        const response = await fetch(
          `${API_URL}/listens/recent?limit=${limit}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch listens");
        }

        const rawData = await response.json();

        const processed = rawData.listens.map((item: any) => {
          console.log("RAW played_at from API:", item.played_at);

          const date = new Date(item.played_at);

          console.log("Parsed Date (ISO):", date.toISOString());
          console.log(
            "Berlin time:",
            date.toLocaleString("de-DE", { timeZone: "Europe/Berlin" })
          );

          return {
            ...item,
            formatted_time: date.toLocaleTimeString([], {
              timeZone,
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
        });


        setListens(processed);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Could not load listens");
      } finally {
        setLoading(false);
      }
    };

    fetchRecentListens();
  }, [limit, timeZone]);

  return { listens, loading, error };
};
