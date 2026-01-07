import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import useMinutesDiagramData from "../../hooks/useMinutesDiagramData";
import { useDateRange } from "../../context/DateRangeContext";

const CustomTooltip = ({ active, payload, selectedRange }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    let headerText = "";

    switch (selectedRange) {
      case "1d":
        // day
        const timeStart = data.start.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone,
        });
        const timeEnd = data.end.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone,
        });
        headerText = `${timeStart} - ${timeEnd}`;
        break;

      case "1w":
      case "4w":
        // week
        headerText = data.xAxisLabel;
        break;

      case "3m":
      case "6m":
        // weeks
        const startStr = data.start.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          timeZone,
        });
        const endStr = data.end.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          timeZone,
        });
        headerText = `${startStr} - ${endStr}`;
        break;

      case "1y":
        // month
        headerText = data.start.toLocaleDateString("en-GB", {
          month: "long",
          timeZone,
        });
        break;

      case "alltime":
        // year
        headerText = data.start.getFullYear().toString();
        break;

      default:
        headerText = data.xAxisLabel;
    }

    const tooltipStyle: React.CSSProperties = {
      backgroundColor: "var(--block-dark)",
      border: `1px solid var(--bs-secondary)`,
      borderRadius: "8px",
      padding: "12px 16px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
      color: "var(--white)",
      minWidth: "140px",
      textAlign: "center",
    };

    return (
      <div className="custom-tooltip" style={tooltipStyle}>
        <div
          style={{
            fontSize: "14px",
            marginBottom: "8px",
            fontWeight: "500",
            color: "var(--bs-secondary)",
          }}
        >
          {headerText}
        </div>
        <div
          style={{
            fontSize: "18px",
            fontWeight: "bold",
            color: "var(--primary-green)",
          }}
        >
          {data.minutes} min
        </div>
      </div>
    );
  }

  return null;
};

const LineDiagram = () => {
  const { data, loading } = useMinutesDiagramData();
  const { selectedRange } = useDateRange();

  if (loading) {
    return (
      <div
        style={{
          width: "100%",
          height: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--white)",
        }}
      >
        Loading chart data...
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "400px" }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--bs-secondary)"
            opacity={0.3}
          />
          <XAxis
            dataKey="xAxisLabel"
            stroke="var(--bs-secondary)"
            style={{ fontSize: "12px", color: "var(--white)" }}
          />
          <YAxis
            stroke="var(--bs-secondary)"
            style={{ fontSize: "12px", color: "var(--white)" }}
          />

          <Tooltip content={<CustomTooltip selectedRange={selectedRange} />} />

          <Legend />
          <Line
            type="monotone"
            dataKey="minutes"
            name="Minutes listened"
            stroke="var(--primary-green)"
            strokeWidth={3}
            dot={{
              fill: "var(--block-dark)",
              stroke: "var(--primary-green)",
              strokeWidth: 2,
              r: 4,
            }}
            activeDot={{ r: 6, stroke: "var(--primary-green)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineDiagram;
