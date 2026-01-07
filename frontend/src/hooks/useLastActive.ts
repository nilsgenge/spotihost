import { useState, useEffect } from "react";
import type { UsePlayerReturn } from "./usePlayerDetails";

interface UseLastActiveReturn {
  value: string;
  title: string;
  loading: boolean;
  error: string | null;
}

const useLastActive = (
  mostRecentTimestamp: Date | null | undefined,
  playerData: UsePlayerReturn
): UseLastActiveReturn => {
  const [value, setValue] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      if (playerData.isLoading) {
        setLoading(true);
        return;
      }
      
      if (playerData.isPlaying) {
        setValue("Active Now");
        setTitle("");
        setLoading(false);
        return; 
      }

      
      if (!mostRecentTimestamp || !(mostRecentTimestamp instanceof Date) || isNaN(mostRecentTimestamp.getTime())) {
        setValue("-"); 
        setTitle("Last active");
        setLoading(false);
        return;
      }

      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - mostRecentTimestamp.getTime()) / 1000);

      let calculatedValue = "";
      let calculatedTitle = "Last active";

      if (diffInSeconds < 300) {
        calculatedValue = "Active now";
        calculatedTitle = "";
      } else if (diffInSeconds < 3600) {
        calculatedValue = `${Math.floor(diffInSeconds / 60)}m ago`;
      } else if (diffInSeconds < 86400) {
        calculatedValue = `${Math.floor(diffInSeconds / 3600)}h ago`;
      } else {
        calculatedValue = `${Math.floor(diffInSeconds / 86400)}d ago`;
      }

      setValue(calculatedValue);
      setTitle(calculatedTitle);

    } catch (err) {
      console.error("Error calculating last active time:", err);
      setError("Data unavailable");
      setValue("");
    } finally {
      setLoading(false);
    }
  }, [mostRecentTimestamp, playerData]);

  return { value, title, loading, error };
};

export default useLastActive;