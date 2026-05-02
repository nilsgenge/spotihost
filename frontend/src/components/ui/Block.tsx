import React, { type ReactNode, type CSSProperties } from "react";
import styles from "./Block.module.scss";

interface BlockProps {
  children: ReactNode;
  fullWidth?: boolean;
  style?: CSSProperties;
  className?: string;
  overflowVisible?: boolean;
}

const Block: React.FC<BlockProps> = ({
  children,
  fullWidth = true,
  style,
  className = "",
  overflowVisible = false,
}) => {
  return (
    <div
      data-block
      className={[
        styles.block,
        "p-3",
        "rounded",
        fullWidth ? "w-100" : "",
        overflowVisible ? styles.overflowVisible : "",
        className,
      ].filter(Boolean).join(" ")}
      style={style}
    >
      {children}
    </div>
  );
};

export default Block;
