import { LineDiagram } from "./LineDiagram";
import type { Bucket } from "../../types/charts";
import { useTotalAlbumYear } from "../../hooks/useAlbumYearCharts";

// Shared components
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="d-flex flex-column align-items-center justify-content-center h-100 text-secondary">
    <i className="bi bi-calendar-event fs-1 mb-3 opacity-50"></i>
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

const yearFormatter = (val: number | null): string => {
  if (val === null) return "No data";
  return `${val}`;
};

// Calculate Y-axis domain: (min - 3) to (max + 3)
const calculateYearDomain = (data: Bucket[]): [number, number] => {
  const values = data
    .map((b) => b.value)
    .filter((v): v is number => v !== null);
  if (values.length === 0) return [1970, 2025]; // Default range

  const min = Math.min(...values);
  const max = Math.max(...values);
  return [min - 3, max + 3];
};

interface BaseProps {
  height?: number;
  color?: string;
}

// Album Release Year
export const AlbumReleaseYearLineDiagram: React.FC<BaseProps> = ({
  color = "var(--primary-green)",
}) => {
  const { data, loading } = useTotalAlbumYear();

  if (loading) return <LoadingState />;

  // Convert 0 values to null (keeps x-axis label but creates visual gap)
  const chartData = data.map((b) => ({
    ...b,
    value: b.value === 0 ? null : b.value,
  }));

  // Check if any bucket has valid data (non-null values)
  const hasData = chartData.some((b) => b.value !== null);
  if (!hasData)
    return <EmptyState message="No album year data in selected timeframe" />;

  const domain = calculateYearDomain(chartData);

  return (
    <LineDiagram
      data={chartData}
      color={color}
      valueFormatter={yearFormatter}
      domain={domain}
    />
  );
};
