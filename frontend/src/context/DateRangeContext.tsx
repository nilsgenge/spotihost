import React, { createContext, useContext, useState, useEffect } from "react";
import { getBrowserTimeZone, toUtcIso } from "../utils/time";

// Define VITE_API_URL to avoid hardcoded URLs
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

type DateRangeKey = "1d" | "1w" | "4w" | "3m" | "6m" | "1y" | "alltime";

interface DateRangeContextType {
  selectedRange: DateRangeKey;
  setSelectedRange: (range: DateRangeKey) => void;

  startDate: Date;
  endDate: Date;

  startUtcIso: string;
  endUtcIso: string;

  timeZone: string;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(
  undefined
);

export const DateRangeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [selectedRange, setSelectedRange] = useState<DateRangeKey>("4w");
  const [timeZone, setTimeZone] = useState<string>("UTC");

  useEffect(() => {
    const browserTz = getBrowserTimeZone();

    if (browserTz) {
      setTimeZone(browserTz);
      return;
    }

    // --- FIX: Use VITE_API_URL, not hardcoded localhost ---
    fetch(`${API_URL}/timezone`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.timezone) {
          setTimeZone(data.timezone);
        }
      })
      .catch(() => {
        // Fallback if backend fails
        setTimeZone("UTC");
      });
  }, []);

  const getStartDate = (days: number): Date => {
    const now = new Date();
    now.setDate(now.getDate() - days);
    return now;
  };

  const startDate = getStartDate(dateRanges[selectedRange].days);
  const endDate = new Date();

  return (
    <DateRangeContext.Provider
      value={{
        selectedRange,
        setSelectedRange,
        startDate,
        endDate,
        startUtcIso: toUtcIso(startDate),
        endUtcIso: toUtcIso(endDate),
        timeZone,
      }}
    >
      {children}
    </DateRangeContext.Provider>
  );
};

export const useDateRange = () => {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error("useDateRange must be used within a DateRangeProvider");
  }
  return context;
};

export type { DateRangeKey };
export type DateRanges = Record<DateRangeKey, { label: string; days: number }>;

export const dateRanges: DateRanges = {
  "1d": { label: "1D", days: 1 },
  "1w": { label: "1W", days: 7 },
  "4w": { label: "4W", days: 28 },
  "3m": { label: "3M", days: 90 },
  "6m": { label: "6M", days: 182 },
  "1y": { label: "1Y", days: 365 },
  alltime: { label: "All time", days: 9999 },
};
