import React, { type ReactNode, type CSSProperties } from "react";

interface BlockProps {
  children: ReactNode;
  fullWidth?: boolean;
  style?: CSSProperties;
  className?: string;
}

const Block: React.FC<BlockProps> = ({
  children,
  fullWidth = true,
  style,
  className = "",
}) => {
  const widthClass = fullWidth ? "w-100" : "";

  return (
    <div
      className={`block p-3 rounded ${widthClass} ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
};

export default Block;
