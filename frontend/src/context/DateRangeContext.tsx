import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";

export type DateRangeKey = "1d" | "1w" | "4w" | "3m" | "6m" | "1y" | "alltime";

interface DateRangeContextType {
  selectedRange: DateRangeKey;
  setSelectedRange: (range: DateRangeKey) => void;
  timeZone: string;
}

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

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setTimeZone(tz);
    } catch (e) {
      console.error("Could not detect timezone", e);
    }
  }, []);

  const value = useMemo(
    () => ({
      selectedRange,
      setSelectedRange,
      timeZone,
    }),
    [selectedRange, timeZone],
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

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setNow(new Date());
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const { startDate, endDate } = useMemo(() => {
    const end = now;
    let start = new Date();

    switch (context.selectedRange) {
      case "1d":
        start = new Date(now);
        start.setMinutes(0, 0, 0);
        start.setHours(start.getHours() - 24);
        break;

      case "1w": {
        const midnight = getStartOfDayInTimezone(now, context.timeZone);
        start = new Date(midnight);
        start.setDate(start.getDate() - 6);
        break;
      }

      case "4w": {
        const midnight = getStartOfDayInTimezone(now, context.timeZone);
        start = new Date(midnight);
        start.setDate(start.getDate() - 29);
        break;
      }

      case "3m": {
        const midnight = getStartOfDayInTimezone(now, context.timeZone);
        start = new Date(midnight);
        start.setDate(start.getDate() - 89);
        break;
      }

      case "6m": {
        const midnight = getStartOfDayInTimezone(now, context.timeZone);
        start = new Date(midnight);
        start.setDate(start.getDate() - 179);
        break;
      }

      case "1y": {
        const midnight = getStartOfDayInTimezone(now, context.timeZone);
        start = new Date(midnight);
        start.setDate(1);
        start.setMonth(start.getMonth() - 11);
        break;
      }

      case "alltime":
        start = new Date("2000-01-01T00:00:00Z");
        break;

      default:
        start = new Date(now);
        start.setDate(start.getDate() - 7);
    }

    return { startDate: start, endDate: end };
  }, [context.selectedRange, context.timeZone, now]);

  const startUtcIso = useMemo(() => startDate.toISOString(), [startDate]);
  const endUtcIso = useMemo(() => endDate.toISOString(), [endDate]);

  return {
    selectedRange: context.selectedRange,
    setSelectedRange: context.setSelectedRange,
    startDate,
    endDate,
    startUtcIso,
    endUtcIso,
    timeZone: context.timeZone,
  };
};

const getStartOfDayInTimezone = (date: Date, tzId: string): Date => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tzId,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const dateString = formatter.format(date);
  const parts = dateString.split("-");
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);

  const targetNowParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tzId,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: string) =>
    parseInt(targetNowParts.find((p) => p.type === type)?.value || "0");
  const targetHour = getPart("hour");
  const targetMinute = getPart("minute");

  const utcHour = date.getUTCHours();
  const utcMinute = date.getUTCMinutes();
  const currentOffsetMinutes =
    utcHour * 60 + utcMinute - (targetHour * 60 + targetMinute);

  const utcMidnight = new Date(Date.UTC(year, month, day, 0, 0, 0));
  utcMidnight.setMinutes(utcMidnight.getMinutes() + currentOffsetMinutes);

  return utcMidnight;
};
