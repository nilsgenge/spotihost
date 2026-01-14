import React from "react";
import Block from "./Block";
import { Skeleton } from "./Skeleton";
export interface ContentBlockProps {
  children: React.ReactNode;
  title: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
  loading?: boolean;
  error?: string | null;
}

const ContentBlock: React.FC<ContentBlockProps> = ({
  children,
  title,
  buttonLabel,
  onButtonClick,
  loading = false,
  error = null,
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
    <Block fullWidth>
      <div className="d-flex flex-column h-100">
        <div className="mb-3 d-flex">
          <h4 className="fs-6">{displayTitle}</h4>
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
              <span className="ms-2">{buttonLabel}</span>
            </button>
          </div>
        )}
      </div>
    </Block>
  );
};

export default ContentBlock;
