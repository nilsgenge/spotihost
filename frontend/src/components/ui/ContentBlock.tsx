import React from "react";
import Block from "./Block";
import { Skeleton } from "./Skeleton";
import type { CSSProperties } from "react";

export interface ContentBlockProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
  loading?: boolean;
  error?: string | null;
  style?: CSSProperties;
  className?: string;
}

const ContentBlock: React.FC<ContentBlockProps> = ({
  children,
  title,
  description,
  buttonLabel,
  onButtonClick,
  loading = false,
  error = null,
  style,
  className = "",
}) => {
  let displayTitle = title;
  let displayChildren = children;

  if (error) {
    displayTitle = "Error";
    displayChildren = null;
  }

  if (loading) {
    displayTitle = title;
    displayChildren = (
      <div className="d-flex flex-column gap-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} />
        ))}
      </div>
    );
  }

  const handleClick = () => {
    if (!loading && onButtonClick) {
      onButtonClick();
    }
  };

  return (
    <Block fullWidth className={className} style={style}>
      <div className="d-flex flex-column h-100">
        <div className="mb-3">
          <h4 className="fs-6 mb-1">{displayTitle}</h4>
          {description && (
            <small className="text-custom-muted">{description}</small>
          )}
        </div>

        {displayChildren && (
          <div className="flex-grow-1 mb-3">{displayChildren}</div>
        )}

        {buttonLabel && onButtonClick && (
          <div className="d-flex justify-content-end">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleClick}
              disabled={loading}
            >
              {buttonLabel}
            </button>
          </div>
        )}
      </div>
    </Block>
  );
};

export default ContentBlock;
