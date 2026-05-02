import React from "react";
import styles from "./DateRangePicker.module.scss";
import {
  useDateRange,
  dateRanges,
  type DateRangeKey,
} from "../../context/DateRangeContext";

const DateRangePicker: React.FC = () => {
  const { selectedRange, setSelectedRange } = useDateRange();

  return (
    <div className={styles.container}>
      {Object.entries(dateRanges).map(([key, { label }]) => (
        <React.Fragment key={key}>
          {key === "alltime" && (
            <span className={styles.dateRangeSeparator}>|</span>
          )}
          <button
            className={`btn ${
              selectedRange === key ? "btn-primary" : "btn-outline-custom"
            }`}
            onClick={() => setSelectedRange(key as DateRangeKey)}
          >
            {label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

export default DateRangePicker;
