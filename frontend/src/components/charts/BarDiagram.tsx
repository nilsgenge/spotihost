import {
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import type { Bucket } from "../../types/charts";
import styles from "./chart.module.scss";

interface BarDiagramProps {
  data: Bucket[];
  color?: string;
  height?: number;
  valueFormatter?: (value: number) => string;
}

export const BarDiagram: React.FC<BarDiagramProps> = ({
  data,
  color = "var(--primary-green)",
  height = 350,
  valueFormatter = (val) => `${val}`,
}) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const bucket: Bucket = payload[0].payload;
      return (
        <div className={styles.chartTooltip}>
          <div className={styles.chartTooltipHeader}>{bucket.label}</div>
          <div className={styles.chartTooltipValue} style={{ color }}>
            {valueFormatter(bucket.value || 0)}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderTopLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text
        x={x + width / 2}
        y={y - 6}
        fill="var(--white)"
        textAnchor="middle"
        style={{
          fontSize: "0.75rem",
          fontWeight: 500,
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
        }}
      >
        {valueFormatter(value)}
      </text>
    );
  };

  const maxValue = Math.max(...data.map((d) => d.value || 0));

  const cursorFill = "var(--chart-cursor-fill, rgba(255, 255, 255, 0.05))";

  return (
    <div className={styles.chartContainer} style={{ height: `${height}px` }}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        minHeight={0}
        initialDimension={{ width: 1, height: 1 }}
      >
        <BarChart
          data={data}
          margin={{ top: 30, right: 10, left: 10, bottom: 5 }}
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
            interval={0}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: cursorFill }}
            wrapperStyle={{ outline: "none" }}
          />
          <Bar
            dataKey="value"
            fill={color}
            radius={[6, 6, 0, 0]}
            maxBarSize={50}
          >
            <LabelList dataKey="value" content={renderTopLabel} />
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={color}
                fillOpacity={entry.value === maxValue ? 1 : 0.9}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarDiagram;
