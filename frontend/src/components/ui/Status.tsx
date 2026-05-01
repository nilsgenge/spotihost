import React from "react";
import styles from "./Status.module.scss";

interface StatusTextProps {
  text: string;
  status?: "activated" | "deactivated" | "neutral";
}

const Status: React.FC<StatusTextProps> = ({ text, status }) => {
  const colorClass =
    status == "activated"
      ? styles.activated
      : status == "deactivated"
        ? styles.deactivated
        : styles.neutral;

  return <div className={`${styles.status} ${colorClass}`}>{text}</div>;
};

export default Status;
