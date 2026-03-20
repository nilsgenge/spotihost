import { LineDiagram } from "./LineDiagram";
import type { Bucket } from "../../types/charts";
import { useTotalAvgSongLength } from "../../hooks/useAvgSongLengthCharts";

// Shared components
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="d-flex flex-column align-items-center justify-content-center h-100 text-secondary">
    <i className="bi bi-clock-history fs-1 mb-3 opacity-50"></i>
    <span className="text-soft">{message}</span>
  </div>
);

const LoadingState: React.FC<{ label?: string }> = ({ label }) => (
  <div className="d-flex align-items-center justify-content-center h-100 text-secondary">
    <div className="me-2" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
    {label && <span className="text-soft">{label}</span>}
  </div>
);

const minutesFormatter = (val: number | null): string => {
  if (val === null) return "No data";
  return `${val.toFixed(1).replace('.', ',')} minutes`;
};

const tickFormatter = (val: number | null): string => {
  if (val === null) return "";
  return val.toFixed(1).replace('.', ',');
};

// Calculate Y-axis domain: (min - 0.5) to (max + 0.5) for minutes
const calculateMinutesDomain = (data: Bucket[]): [number, number] => {
  const values = data
    .map((b) => b.value)
    .filter((v): v is number => v !== null);
  if (values.length === 0) return [0, 10]; // Default range for minutes

  const min = Math.min(...values);
  const max = Math.max(...values);
  return [min - 0.5, max + 0.5];
};

interface BaseProps {
  height?: number;
  color?: string;
}

// Average Song Length
export const AvgSongLengthLineDiagram: React.FC<BaseProps> = ({
  color = "var(--primary-green)",
}) => {
  const { data, loading } = useTotalAvgSongLength();

  if (loading) return <LoadingState />;

  // Convert 0 values to null (keeps x-axis label but creates visual gap)
  const chartData = data.map((b) => ({
    ...b,
    value: b.value === 0 ? null : b.value,
  }));

  // Check if any bucket has valid data (non-null values)
  const hasData = chartData.some((b) => b.value !== null);
  if (!hasData)
    return <EmptyState message="No song length data in selected timeframe" />;

  const domain = calculateMinutesDomain(chartData);

  return (
    <LineDiagram
      data={chartData}
      color={color}
      valueFormatter={minutesFormatter}
      tickFormatter={tickFormatter}
      domain={domain}
    />
  );
};
