import React, { type ReactNode } from "react";

interface BlockProps {
  children: ReactNode;
  fullWidth?: boolean;
}

const Block: React.FC<BlockProps> = ({ children, fullWidth = true }) => {
  return (
    <div className={`block p-3 rounded ${fullWidth ? "w-100" : ""}`}>
      {children}
    </div>
  );
};

export default Block;
