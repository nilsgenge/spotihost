import PieDiagram from "./PieDiagram";
import {
  useSkipRateData,
  useCompletionRateData,
} from "../../hooks/usePieChartData";
import type { UseBarChartFilters } from "../../types/charts";

interface DiagramProps {
  height?: number;
  donut?: boolean;
  filters?: UseBarChartFilters;
}

// Color mappings
const skipColors: Record<string, string> = {
  Skipped: "var(--danger-red)",
  "Full Listen": "var(--primary-green)",
};

const completionColors: Record<string, string> = {
  "<25%": "#f0fdf4", // green-50
  "<50%": "#bbf7d0", // green-200
  "<75%": "#86efac", // green-300
  "<95%": "#4ade80", // green-400
  "Full Listen": "var(--primary-green)",
};

// Loading/Empty states
const LoadingState: React.FC<{ label?: string }> = ({ label }) => (
  <div className="d-flex align-items-center justify-content-center h-100 text-secondary">
    <div className="me-2" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
    {label && <span className="text-soft">{label}</span>}
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="d-flex flex-column align-items-center justify-content-center h-100 text-secondary">
    <i className="bi bi-pie-chart fs-1 mb-3 opacity-50"></i>
    <span className="text-soft">{message}</span>
  </div>
);

export const SkipRatePieDiagram: React.FC<DiagramProps> = ({
  height = 400,
  donut = true,
  filters = {},
}) => {
  const { data, loading, error, total } = useSkipRateData(filters);

  if (loading) return <LoadingState label="Loading skip rate..." />;
  if (error) return <EmptyState message={`Error: ${error}`} />;
  if (total === 0)
    return <EmptyState message="No plays in selected timeframe" />;

  const coloredData = data.map((item) => ({
    ...item,
    color: skipColors[item.label] || "var(--text-secondary)",
  }));

  return (
    <PieDiagram
      data={coloredData}
      height={height}
      donut={donut}
      innerRadius={donut ? 100 : 0}
      outerRadius={150}
    />
  );
};

export const CompletionRatePieDiagram: React.FC<DiagramProps> = ({
  height = 400,
  donut = true,
  filters = {},
}) => {
  const { data, loading, error, total } = useCompletionRateData(filters);

  if (loading) return <LoadingState label="Loading completion rate..." />;
  if (error) return <EmptyState message={`Error: ${error}`} />;
  if (total === 0)
    return <EmptyState message="No listens with duration data" />;

  const coloredData = data.map((item) => ({
    ...item,
    color: completionColors[item.label] || "var(--text-secondary)",
  }));

  return (
    <PieDiagram
      data={coloredData}
      height={height}
      donut={donut}
      innerRadius={donut ? 100 : 0}
      outerRadius={140}
    />
  );
};
