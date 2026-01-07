import { useState, useEffect } from "react";
import { useDateRange, dateRanges } from "../context/DateRangeContext";

export interface ChartDataPoint {
  xAxisLabel: string;
  minutes: number;
  start: Date;
  end: Date;
}

const useMinutesDiagramData = () => {
  const { selectedRange, startDate, endDate, timeZone } = useDateRange();
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const buckets: Array<{ label: string; start: Date; end: Date }> = [];
      const now = new Date(endDate);

      if (selectedRange === "1d") {
        for (let i = 23; i >= 0; i--) {
          const start = new Date(now);
          start.setHours(now.getHours() - i, 0, 0, 0);
          const end = new Date(start);
          end.setHours(start.getHours() + 1);
          const label = start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone });
          buckets.push({ label, start, end });
        }
      } else if (selectedRange === "1w" || selectedRange === "4w") {
        const days = selectedRange === "1w" ? 7 : 28;
        for (let i = days - 1; i >= 0; i--) {
          const start = new Date(now);
          start.setDate(now.getDate() - i);
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(start.getDate() + 1);
          const label = start.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", timeZone });
          buckets.push({ label, start, end });
        }
      } else if (selectedRange === "3m" || selectedRange === "6m") {
        const totalDays = dateRanges[selectedRange].days;
        const weeksCount = Math.floor(totalDays / 7);
        for (let i = 0; i < weeksCount; i++) {
          const endOfBucket = new Date(now);
          endOfBucket.setDate(now.getDate() - (i * 7));
          endOfBucket.setHours(23, 59, 59, 999);

          const startOfBucket = new Date(endOfBucket);
          startOfBucket.setDate(endOfBucket.getDate() - 6);
          startOfBucket.setHours(0, 0, 0, 0);

          const label = startOfBucket.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone });
          buckets.push({ label, start: startOfBucket, end: endOfBucket });
        }
        buckets.reverse();
      } else if (selectedRange === "1y") {
        for (let i = 11; i >= 0; i--) {
          const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
          const label = start.toLocaleDateString("en-GB", { month: "long", timeZone });
          buckets.push({ label, start, end });
        }
      } else if (selectedRange === "alltime") {
        let year = now.getFullYear();
        for (let i = 0; i < 10; i++) { 
           const start = new Date(year - i, 0, 1);
           const label = year.toString();
           buckets.push({ label, start, end: new Date(year-i+1,0,1) });
           year--;
        }
        buckets.reverse();
      }

      try {
        const params = new URLSearchParams({
          start: buckets[0].start.toISOString(),
          end: buckets[buckets.length - 1].end.toISOString(),
        });
        
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

        const response = await fetch(`${API_URL}/listens/activity?${params.toString()}`);
        const result = await response.json();
        
        const chartData = buckets.map(bucket => ({
            xAxisLabel: bucket.label,
            minutes: 0,
            start: bucket.start,
            end: bucket.end,
        }));

        result.activity.forEach((item: { timestamp: string; minutes: number }) => {
            const itemTime = new Date(item.timestamp);
            
            const bucketIndex = chartData.findIndex(b => 
                itemTime >= b.start && itemTime < b.end
            );

            if (bucketIndex !== -1) {
                chartData[bucketIndex].minutes += item.minutes;
            }
        });

        setData(chartData);

      } catch (error) {
        console.error(error);
        setData(buckets.map(b => ({ 
            xAxisLabel: b.label, 
            minutes: 0, 
            start: b.start, 
            end: b.end 
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedRange, startDate, endDate, timeZone]);

  return { data, loading };
};

export default useMinutesDiagramData;