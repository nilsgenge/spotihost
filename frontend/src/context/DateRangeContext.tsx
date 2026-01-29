import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { getBrowserTimeZone, toUtcIso } from "../utils/time";

export type DateRangeKey = "1d" | "1w" | "4w" | "3m" | "6m" | "1y" | "alltime";

interface DateRangeContextType {
  selectedRange: DateRangeKey;
  setSelectedRange: (range: DateRangeKey) => void;
  startDate: Date;
  endDate: Date;
  startUtcIso: string;
  endUtcIso: string;
  timeZone: string;
}

const getStartDate = (days: number): Date => {
  const now = new Date();
  now.setDate(now.getDate() - days);
  now.setHours(0, 0, 0, 0);
  return now;
};

export type DateRanges = Record<DateRangeKey, { label: string; days: number }>;

export const dateRanges: DateRanges = {
  "1d": { label: "1D", days: 1 },
  "1w": { label: "1W", days: 7 },
  "4w": { label: "4W", days: 30 },
  "3m": { label: "3M", days: 91 },
  "6m": { label: "6M", days: 182 },
  "1y": { label: "1Y", days: 365 },
  alltime: { label: "All time", days: 9999 },
};

const DateRangeContext = createContext<DateRangeContextType | undefined>(
  undefined,
);

export const DateRangeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [selectedRange, setSelectedRange] = useState<DateRangeKey>("4w");
  const [timeZone, setTimeZone] = useState<string>("UTC");

  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const days = dateRanges[selectedRange].days;
    const start = getStartDate(days);
    return { startDate: start, endDate: end };
  }, [selectedRange]);

  useEffect(() => {
    const browserTz = getBrowserTimeZone();
    setTimeZone(browserTz || "UTC");
  }, []);

  const startUtcIso = useMemo(() => toUtcIso(startDate), [startDate]);
  const endUtcIso = useMemo(() => toUtcIso(endDate), [endDate]);

  const value = useMemo(
    () => ({
      selectedRange,
      setSelectedRange,
      startDate,
      endDate,
      startUtcIso,
      endUtcIso,
      timeZone,
    }),
    [selectedRange, startDate, endDate, startUtcIso, endUtcIso, timeZone],
  );

  return (
    <DateRangeContext.Provider value={value}>
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
