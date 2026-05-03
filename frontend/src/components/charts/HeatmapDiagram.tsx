import React, { useState, useEffect, useRef } from "react";
import { useHeatmapData } from "../../hooks/useHeatmapData";
import type { HeatmapData } from "../../types/charts";
import styles from "./HeatmapDiagram.module.scss";
import chartStyles from "./chart.module.scss";

const HEATMAP_COLORS = [
  "rgba(255, 255, 255, 0.04)",
  "#0e4429",
  "#006d32",
  "#26a641",
  "#39d353",
];

interface GridCell {
  date: string;
  count: number;
  week: number;
  dayOfWeek: number;
  empty?: boolean;
}

interface MonthLabel {
  label: string;
  week: number;
}

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildGridCells(data: HeatmapData): GridCell[] {
  const cells: GridCell[] = [];
  const start = new Date(data.start_date + "T00:00:00");
  const end = new Date(data.end_date + "T00:00:00");

  const startDayOfWeek = start.getDay();

  // Pad with empty cells so the grid aligns to Sunday
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push({
      date: "",
      count: 0,
      week: 0,
      dayOfWeek: i,
      empty: true,
    });
  }

  const current = new Date(start);
  while (current <= end) {
    const dateStr = formatLocalDate(current);
    const dayOfWeek = current.getDay();
    const daysSinceStart = Math.floor(
      (current.getTime() - start.getTime()) / 86400000,
    );
    const week = Math.floor((daysSinceStart + startDayOfWeek) / 7);

    cells.push({
      date: dateStr,
      count: data.days[dateStr] || 0,
      week,
      dayOfWeek,
    });

    current.setDate(current.getDate() + 1);
  }

  return cells;
}

function computeLevels(cells: GridCell[]): {
  levels: number[];
  thresholds: number[];
} {
  const nonZero = cells.map((c) => c.count).filter((c) => c > 0);

  if (nonZero.length === 0) {
    return {
      levels: cells.map(() => 0),
      thresholds: [0, 0, 0, 0],
    };
  }

  nonZero.sort((a, b) => a - b);

  const percentile = (p: number) => {
    const idx = Math.floor((p / 100) * nonZero.length);
    return nonZero[Math.min(idx, nonZero.length - 1)];
  };

  const p25 = percentile(25);
  const p50 = percentile(50);
  const p75 = percentile(75);

  const levels = cells.map((c) => {
    if (c.count === 0) return 0;
    if (c.count <= p25) return 1;
    if (c.count <= p50) return 2;
    if (c.count <= p75) return 3;
    return 4;
  });

  return { levels, thresholds: [p25, p50, p75] };
}

function computeMonthLabels(cells: GridCell[]): MonthLabel[] {
  const labels: MonthLabel[] = [];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  let lastMonth = -1;

  for (const cell of cells) {
    if (!cell.date) continue;
    const month = new Date(cell.date + "T00:00:00").getMonth();
    if (month !== lastMonth) {
      labels.push({ label: months[month], week: cell.week });
      lastMonth = month;
    }
  }

  return labels;
}

export const HeatmapDiagram: React.FC = () => {
  const { data, loading } = useHeatmapData();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    date: string;
    plays: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!tooltip) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setTooltip(null);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [tooltip]);

  if (loading) {
    return (
      <div className={styles.heatmapWrapper}>
        <div className={styles.heatmapScrollContainer}>
          <div className={styles.heatmapLoadingGrid}>
            {Array.from({ length: 7 * 53 }).map((_, i) => (
              <div key={i} className={`${styles.heatmapCell} ${styles.heatmapCellLoading}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const cells = buildGridCells(data);
  const { levels } = computeLevels(cells);
  const monthLabels = computeMonthLabels(cells);

  const realCells = cells.filter((c) => !c.empty);
  const totalPlays = realCells.reduce((sum, c) => sum + c.count, 0);
  const totalDays = realCells.length;
  const avgPerDay = totalDays > 0 ? (totalPlays / totalDays).toFixed(1) : "0";

  const formatDate = (cell: GridCell): string => {
    const date = new Date(cell.date + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatPlays = (count: number): string => {
    if (count === 0) return "No Plays";
    return count === 1 ? "1 play" : `${count} plays`;
  };

  const showTooltipFor = (e: React.SyntheticEvent, cell: GridCell) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      date: formatDate(cell),
      plays: formatPlays(cell.count),
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  };

  const handleCellEnter = (e: React.MouseEvent, cell: GridCell) => {
    if (cell.empty) return;
    showTooltipFor(e, cell);
  };

  const handleCellPointerUp = (e: React.PointerEvent, cell: GridCell) => {
    if (cell.empty) return;
    if (e.pointerType === "mouse") return;
    const formatted = formatDate(cell);
    if (tooltip && tooltip.date === formatted) {
      setTooltip(null);
    } else {
      showTooltipFor(e, cell);
    }
  };

  return (
    <div className={styles.heatmapWrapper} ref={wrapperRef}>
      <div className={styles.heatmapSummary}>
        {totalPlays.toLocaleString()} plays in the last year &middot;{" "}
        {avgPerDay} plays/day on average
      </div>

      <div className={styles.heatmapScrollContainer}>
        <div className={styles.heatmapDayLabels}>
          <span />
          <span>Mon</span>
          <span />
          <span>Wed</span>
          <span />
          <span>Fri</span>
          <span />
        </div>

        <div className={styles.heatmapGridArea}>
          <div className={styles.heatmapMonthLabels}>
            {monthLabels.map((ml, i) => (
              <span
                key={i}
                style={{
                  left: `calc(${ml.week} * (var(--heatmap-cell) + var(--heatmap-gap)))`,
                }}
              >
                {ml.label}
              </span>
            ))}
          </div>

          <div className={styles.heatmapGrid}>
            {cells.map((cell, i) => (
              <div
                key={cell.empty ? `empty-${i}` : cell.date}
                className={`${styles.heatmapCell}${cell.empty ? ` ${styles.heatmapCellEmpty}` : ""}`}
                style={{
                  backgroundColor: cell.empty
                    ? "transparent"
                    : HEATMAP_COLORS[levels[i]],
                }}
                onMouseEnter={(e) => handleCellEnter(e, cell)}
                onMouseLeave={() => setTooltip(null)}
                onPointerUp={(e) => handleCellPointerUp(e, cell)}
              />
            ))}
          </div>
        </div>
      </div>

      {tooltip && (
        <div
          className={chartStyles.chartTooltip}
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          <div className={chartStyles.chartTooltipHeader}>{tooltip.date}</div>
          <div className={chartStyles.chartTooltipValue}>{tooltip.plays}</div>
        </div>
      )}

      <div className={styles.heatmapLegend}>
        <span>Less</span>
        {HEATMAP_COLORS.map((color, i) => (
          <div
            key={i}
            className={styles.heatmapLegendCell}
            style={{ backgroundColor: color }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
};
