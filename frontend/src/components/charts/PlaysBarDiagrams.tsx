import { BarDiagram } from "./BarDiagram";
import {
  useBarChartData,
  useDayOfWeekData,
  useMonthData,
  useYearData,
} from "../../hooks/useBarChartData";
import type { CategoricalBucket } from "../../types/charts";

// Shared components
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="d-flex flex-column align-items-center justify-content-center h-100 text-secondary">
    <i className="bi bi-bar-chart-line fs-1 mb-3 opacity-50"></i>
    <span className="text-soft">{message}</span>
  </div>
);

const LoadingState: React.FC = () => (
  <div className="d-flex align-items-center justify-content-center h-100 text-secondary">
    <div className="spinner-border spinner-border-sm me-2" role="status" />
    <span className="text-soft">Loading...</span>
  </div>
);

interface BaseProps {
  height?: number;
  color?: string;
}

const adaptBuckets = (data: CategoricalBucket[]): any[] =>
  data.map((bucket) => ({
    label: bucket.label,
    value: bucket.value,
    start: "",
    end: "",
  }));

// Day of Week
interface DayOfWeekProps extends BaseProps {
  artistId?: string;
  albumId?: string;
  trackId?: string;
}

export const DayOfWeekBarDiagram: React.FC<DayOfWeekProps> = ({
  height = 400,
  color = "var(--primary-green)",
  ...filters
}) => {
  const { data, loading } = useDayOfWeekData(filters);

  if (loading) return <LoadingState />;

  const hasData = data.some((b) => b.value > 0);
  if (!hasData) return <EmptyState message="No plays to display" />;

  return (
    <BarDiagram
      data={adaptBuckets(data)}
      height={height}
      color={color}
      valueFormatter={(val: any) => `${val}`}
    />
  );
};

// Month
interface MonthProps extends BaseProps {
  artistId?: string;
  albumId?: string;
  trackId?: string;
}

export const MonthBarDiagram: React.FC<MonthProps> = ({
  height = 400,
  color = "var(--primary-green)",
  ...filters
}) => {
  const { data, loading } = useMonthData(filters);

  if (loading) return <LoadingState />;

  const hasData = data.some((b) => b.value > 0);
  if (!hasData) return <EmptyState message="No plays to display" />;

  return (
    <BarDiagram
      data={adaptBuckets(data)}
      height={height}
      color={color}
      valueFormatter={(val: any) => `${val}`}
    />
  );
};

// Year
interface YearProps extends BaseProps {
  artistId?: string;
  albumId?: string;
  trackId?: string;
}

export const YearBarDiagram: React.FC<YearProps> = ({
  height = 400,
  color = "var(--primary-green)",
  ...filters
}) => {
  const { data, loading } = useYearData(filters);

  if (loading) return <LoadingState />;

  const hasData = data.some((b) => b.value > 0);
  if (!hasData) return <EmptyState message="No plays to display" />;

  return (
    <BarDiagram
      data={adaptBuckets(data)}
      height={height}
      color={color}
      valueFormatter={(val: any) => `${val}`}
    />
  );
};

// Generic component for any category
interface PlaysBarDiagramProps extends BaseProps {
  category: "dayofweek" | "month" | "year";
  artistId?: string;
  albumId?: string;
  trackId?: string;
}

export const PlaysBarDiagram: React.FC<PlaysBarDiagramProps> = ({
  category,
  height = 400,
  color = "var(--primary-green)",
  ...filters
}) => {
  const { data, loading } = useBarChartData(category, filters);

  if (loading) return <LoadingState />;

  const hasData = data.some((b) => b.value > 0);
  if (!hasData) return <EmptyState message="No plays to display" />;

  return (
    <BarDiagram
      data={adaptBuckets(data)}
      height={height}
      color={color}
      valueFormatter={(val: any) => `${val}`}
    />
  );
};
