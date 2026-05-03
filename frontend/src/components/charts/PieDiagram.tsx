import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PieBucket } from "../../types/charts";
import styles from "./chart.module.scss";

interface PieDiagramProps {
  data: PieBucket[];
  height?: number;
  donut?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  showLabels?: boolean;
  showLegend?: boolean;
  tooltipLabels?: Record<string, string>;
}

const CustomLegend = (props: any) => (
  <div className={styles.chartLegend}>
    {props.payload.map((entry: any, index: number) => (
      <div key={index} className={styles.chartLegendItem}>
        <div
          className={styles.chartLegendColor}
          style={{ backgroundColor: entry.color }}
        />
        <span className={styles.chartLegendLabel}>{entry.payload.label}</span>
      </div>
    ))}
  </div>
);

const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
};

const PieDiagram: React.FC<PieDiagramProps> = ({
  data,
  height = 400,
  donut = true,
  innerRadius = 90,
  outerRadius = 140,
  showLabels = true,
  showLegend = true,
  tooltipLabels,
}) => {
  const isMobile = useIsMobile();
  const chartMargin = isMobile
    ? { top: 20, right: 10, bottom: 60, left: 10 }
    : { top: 40, right: 60, bottom: 80, left: 60 };
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item: PieBucket = payload[0].payload;

      const displayLabel = tooltipLabels?.[item.label] || item.label;

      return (
        <div className={styles.chartTooltip}>
          <div className={styles.chartTooltipHeader}>{displayLabel}</div>
          <div className={styles.chartTooltipValue} style={{ color: item.color }}>
            {item.value.toLocaleString()} plays ({item.percentage}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.chartContainer} style={{ height: `${height}px` }}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        minHeight={0}
        initialDimension={{ width: 1, height: 1 }}
      >
        <PieChart margin={chartMargin}>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            outerRadius={outerRadius}
            innerRadius={donut ? innerRadius : 0}
            dataKey="value"
            paddingAngle={2}
            cornerRadius={4}
            labelLine
            label={({ x, y, textAnchor, dominantBaseline, payload }) => {
              if (!showLabels) return null;
              return (
                <text
                  x={x}
                  y={y}
                  textAnchor={textAnchor}
                  dominantBaseline={dominantBaseline}
                  fill={payload.color}
                  fontSize={14}
                  fontWeight={700}
                >
                  {`${payload.percentage}%`}
                </text>
              );
            }}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke="var(--block-dark)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={40}
              content={<CustomLegend />}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieDiagram;
