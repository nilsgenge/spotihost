import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PieBucket } from "../../types/charts";

interface PieDiagramProps {
  data: PieBucket[];
  height?: number;
  donut?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  showLabels?: boolean;
  showLegend?: boolean;
}

const CustomLegend = (props: any) => (
  <div className="chart-legend">
    {props.payload.map((entry: any, index: number) => (
      <div key={index} className="chart-legend-item">
        <div
          className="chart-legend-color"
          style={{ backgroundColor: entry.color }}
        />
        <span className="chart-legend-label">{entry.payload.label}</span>
      </div>
    ))}
  </div>
);

const PieDiagram: React.FC<PieDiagramProps> = ({
  data,
  height = 400,
  donut = true,
  innerRadius = 90,
  outerRadius = 140,
  showLabels = true,
  showLegend = true,
}) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item: PieBucket = payload[0].payload;

      const tooltipLabelMap: Record<string, string> = {
        Skipped: "<30s listened",
        "Full Listen": ">95% listened",
      };

      const displayLabel = tooltipLabelMap[item.label] || item.label;

      return (
        <div className="chart-tooltip">
          <div className="chart-tooltip-header">{displayLabel}</div>
          <div className="chart-tooltip-value" style={{ color: item.color }}>
            {item.value.toLocaleString()} plays ({item.percentage}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container" style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 20, right: 60, bottom: 20, left: 60 }}>
          <Pie
            data={data}
            cx="50%"
            cy="48%"
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
