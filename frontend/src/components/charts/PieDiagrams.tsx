import PieDiagram from "./PieDiagram";
import { usePieChartData } from "../../hooks/usePieChartData";
import { generateColorGradient } from "../../utils/colorGradient";
import type { UseBarChartFilters, PieChartConfig } from "../../types/charts";

interface DiagramProps {
  height?: number;
  donut?: boolean;
  filters?: UseBarChartFilters;
  allTime?: boolean;
}

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

const ConfigurablePieDiagram: React.FC<DiagramProps & PieChartConfig> = ({
  endpoint,
  lightColor,
  darkColor,
  unknownColor = "#6b7280",
  customColors,
  tooltipLabels = {},
  loadingLabel,
  emptyMessage,
  height = 400,
  donut = true,
  filters = {},
  allTime,
}) => {
  const { data, loading, error, total } = usePieChartData(endpoint, {
    ...filters,
    allTime,
  });

  if (loading) return <LoadingState label={loadingLabel} />;
  if (error) return <EmptyState message={`Error: ${error}`} />;
  if (total === 0) return <EmptyState message={emptyMessage} />;

  const capitalizedData = data.map((item) => ({
    ...item,
    label: item.label.charAt(0).toUpperCase() + item.label.slice(1),
  }));

  // Generate gradient colors dynamically based on data
  const labels = capitalizedData.map((d) => d.label);
  const colorMap = generateColorGradient(labels, {
    lightColor,
    darkColor,
    excludeLabel: "Unknown",
    unknownColor,
  });

  // Apply colors to data (customColors override gradient colors)
  const coloredData = capitalizedData.map((item) => ({
    ...item,
    color: customColors?.[item.label] || colorMap[item.label] || unknownColor,
  }));

  const outerRadius = endpoint === "completion-rate" ? 140 : 150;

  return (
    <PieDiagram
      data={coloredData}
      height={height}
      donut={donut}
      innerRadius={donut ? 100 : 0}
      outerRadius={outerRadius}
      tooltipLabels={tooltipLabels}
    />
  );
};

// Exported diagram components
export const SkipRatePieDiagram: React.FC<DiagramProps> = (props) => (
  <ConfigurablePieDiagram
    endpoint="skip-rate"
    lightColor="#dc2626"
    darkColor="#dc2626"
    unknownColor="#76787c"
    tooltipLabels={{ Skipped: "<30s listened", "Full Listen": ">30s listened" }}
    loadingLabel="Loading skip rate..."
    emptyMessage="No plays in selected timeframe"
    customColors={{ Skipped: "#dc2626", "Full Listen": "#22c55e" }}
    {...props}
  />
);

export const CompletionRatePieDiagram: React.FC<DiagramProps> = (props) => (
  <ConfigurablePieDiagram
    endpoint="completion-rate"
    lightColor="#bef0cf"
    darkColor="#22c55e"
    unknownColor="#76787c"
    loadingLabel="Loading completion rate..."
    emptyMessage="No listens with duration data"
    {...props}
  />
);

export const PlatformPieDiagram: React.FC<DiagramProps> = (props) => (
  <ConfigurablePieDiagram
    endpoint="platform"
    lightColor="#bef0cf"
    darkColor="#22c55e"
    unknownColor="#76787c"
    loadingLabel="Loading platform data..."
    emptyMessage="No platform data available"
    {...props}
  />
);

export const ContextPieDiagram: React.FC<DiagramProps> = (props) => (
  <ConfigurablePieDiagram
    endpoint="context"
    lightColor="#bef0cf"
    darkColor="#22c55e"
    unknownColor="#76787c"
    loadingLabel="Loading context data..."
    emptyMessage="No context data available"
    {...props}
  />
);
