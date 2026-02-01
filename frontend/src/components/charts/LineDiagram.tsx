import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Bucket } from "../../types/charts";

interface LineDiagramProps {
  data: Bucket[];
  color?: string;
  valueFormatter?: (value: number | null) => string;
}

const defaultFormatter = (val: number | null) =>
  val !== null ? `${val} min` : "No data";

export const LineDiagram: React.FC<LineDiagramProps> = ({
  data,
  color = "var(--primary-green)",
  valueFormatter = defaultFormatter,
}) => {
  const chartData = data.map((bucket) => ({
    ...bucket,
    displayValue: bucket.value,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const bucket: Bucket = payload[0].payload;
      return (
        <div className="chart-tooltip">
          <div className="chart-tooltip-header">{bucket.label}</div>
          <div className="chart-tooltip-value" style={{ color: color }}>
            {valueFormatter(bucket.value)}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--chart-grid)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            stroke="var(--chart-axis)"
            tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
            axisLine={{ stroke: "var(--chart-axis)" }}
            tickLine={{ stroke: "var(--chart-axis)" }}
          />
          <YAxis
            stroke="var(--chart-axis)"
            tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
            axisLine={{ stroke: "var(--chart-axis)" }}
            tickLine={{ stroke: "var(--chart-axis)" }}
            tickFormatter={(val) => (val !== null ? `${val}` : "")}
            domain={[
              0,
              (dataMax: number) => Math.max(5, Math.ceil(dataMax * 1.15)),
            ]}
            allowDecimals={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{
              stroke: "var(--cursor-line)",
              strokeWidth: 1,
              strokeDasharray: "4 4",
            }}
          />
          <Line
            type="monotone"
            dataKey="displayValue"
            stroke={color}
            strokeWidth={3}
            dot={{
              fill: "var(--dark-background)",
              stroke: color,
              strokeWidth: 2,
              r: 5,
            }}
            activeDot={{
              r: 7,
              fill: color,
              stroke: "var(--white)",
              strokeWidth: 2,
            }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
