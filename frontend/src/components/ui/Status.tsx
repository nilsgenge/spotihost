import React from "react";

interface StatusTextProps {
  text: string;
  status?: "activated" | "deactivated" | "neutral";
}

const Status: React.FC<StatusTextProps> = ({ text, status }) => {
  const bgColor =
    status == "activated"
      ? "status-color-activated"
      : status == "deactivated"
      ? "status-color-deactivated"
      : "status-color-neutral";

  return <div className={`status ${bgColor}`}>{text}</div>;
};

export default Status;
