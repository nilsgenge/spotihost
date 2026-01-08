import React from "react";
import { FaArrowUp, FaArrowDown } from "react-icons/fa";
import Block from "./Block";

interface StatBlockProps {
  icon?: React.ReactNode;
  imageUrl?: string;
  title?: string;
  value: string | undefined | null;
  change?: number;
  label?: string;
  url?: string | null;
  fixedHeight?: boolean;
}

const StatBlock: React.FC<StatBlockProps> = ({
  icon,
  imageUrl,
  title,
  value,
  change,
  label,
  url,
  fixedHeight = false,
}) => {
  const hasTitle = Boolean(title && title.trim());

  const changeColor =
    change !== undefined
      ? change > 0
        ? "text-custom-success"
        : "text-custom-danger"
      : "text-custom-success";

  const baseClasses =
    "icon-square d-flex align-items-center justify-content-center";

  const renderVisual = () => {
    if (!imageUrl && !icon) return null;

    const content = imageUrl ? (
      <div
        className={`${baseClasses} rounded-2`}
        style={{
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
    ) : (
      <div className={`${baseClasses} rounded bg-primary text-white`}>
        {icon}
      </div>
    );

    return url ? (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-decoration-none"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </a>
    ) : (
      content
    );
  };

  return (
    <Block>
      <div className="d-flex align-items-center gap-3 text-truncate">
        {renderVisual()}

        <div
          className={[
            fixedHeight ? "stat-fixed" : "",
            fixedHeight && !hasTitle ? "no-title" : "",
          ].join(" ")}
        >
          {hasTitle && (
            <div className="text-custom-muted f-5 stat-title">{title}</div>
          )}

          <div className="fw-bold fs-3 stat-value">
            {value}

            {change !== undefined && change !== 0 && (
              <span className={`${changeColor} fs-6`}>
                {change > 0 ? (
                  <FaArrowUp size={12} />
                ) : (
                  <FaArrowDown size={12} />
                )}{" "}
                {Math.abs(change)}
              </span>
            )}

            {label && (
              <span className="text-custom-muted fs-6 ms-2">{label}</span>
            )}
          </div>
        </div>
      </div>
    </Block>
  );
};

export default StatBlock;
