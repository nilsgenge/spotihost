import React from "react";

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  variant?: "text" | "circular" | "rectangular";
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = "20px",
  className = "",
  variant = "rectangular",
}) => {
  const baseClasses = "skeleton-pulse";
  const variantClasses = {
    text: "rounded",
    circular: "rounded-circle",
    rectangular: "rounded-2",
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
    />
  );
};

export const StatBlockSkeleton = () => (
  <div className="block p-3 rounded w-100">
    <div className="d-flex align-items-center gap-3">
      <Skeleton variant="circular" width="40px" height="40px" />
      <div className="flex-grow-1">
        <Skeleton width="60%" height="16px" className="mb-2" />
        <Skeleton width="40%" height="24px" />
      </div>
    </div>
  </div>
);

export const ElementBlockSkeleton = () => (
  <div className="block p-3 rounded w-100">
    <div className="d-flex align-items-center gap-3">
      <Skeleton variant="rectangular" width="51.2px" height="51.2px" />
      <div className="flex-grow-1">
        <Skeleton width="70%" height="18px" className="mb-2" />
        <Skeleton width="50%" height="14px" />
      </div>
      <Skeleton width="80px" height="14px" />
    </div>
  </div>
);
