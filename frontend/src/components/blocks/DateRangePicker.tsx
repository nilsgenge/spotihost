import React from "react";
import {
  useDateRange,
  dateRanges,
  type DateRangeKey,
} from "../../context/DateRangeContext";

const DateRangePicker: React.FC = () => {
  const { selectedRange, setSelectedRange } = useDateRange();

  return (
    <div className="d-flex gap-2 flex-wrap">
      {Object.entries(dateRanges).map(([key, { label }]) => (
        <button
          key={key}
          className={`btn ${
            selectedRange === key ? "btn-primary" : "btn-outline-custom"
          }`}
          onClick={() => setSelectedRange(key as DateRangeKey)}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default DateRangePicker;
