import React from "react";
import { FaQuestion } from "react-icons/fa";
import { Link } from "react-router-dom";
import Block from "./Block";
import type { ArtistLink } from "../../types/types";

interface ElementBlockProps {
  image?: string;
  title: string;
  title_url?: string;
  label?: ArtistLink[];
  stat?: string;
  className?: string;
  number?: number | string;
  fullWidth?: boolean;
}

const ElementBlock: React.FC<ElementBlockProps> = ({
  image,
  title,
  label,
  stat,
  title_url,
  number,
  className = "",
  fullWidth = true,
}) => {
  const renderImage = () => {
    const imageStyle = image ? { backgroundImage: `url(${image})` } : {};
    const ariaLabel = image ? `${title} cover art` : "No cover art available";

    return (
      <div
        role="img"
        aria-label={ariaLabel}
        className={`element-cover rounded-2 element-image ${
          !image
            ? "bg-primary text-white d-flex align-items-center justify-content-center"
            : ""
        }`}
        style={imageStyle}
      >
        {!image && <FaQuestion aria-hidden="true" />}
      </div>
    );
  };

  const renderArtists = () => {
    if (!label || label.length === 0) return null;

    return label.map((artist, index) => {
      const isLast = index === label.length - 1;
      const key = artist.url || index;

      return (
        <React.Fragment key={key}>
          {artist.url ? (
            <Link to={artist.url} className="text-reset hover-underline">
              {artist.name}
            </Link>
          ) : (
            <span>{artist.name}</span>
          )}
          {!isLast && ", "}
        </React.Fragment>
      );
    });
  };

  const titleContent = title_url ? (
    <Link
      to={title_url}
      className="fw-bold text-reset hover-underline text-truncate d-block"
      title={title}
      style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
    >
      {title}
    </Link>
  ) : (
    <div className="fw-bold text-truncate" title={title} style={{ minWidth: 0 }}>
      {title}
    </div>
  );

  return (
    <Block fullWidth={fullWidth} className={`min-w-0 ${className}`}>
      <div className="d-flex align-items-center gap-3 w-100 min-w-0">
        {number !== undefined && (
          <div
            className="text-custom-muted small flex-shrink-0 text-end me-2"
            style={{ width: "24px" }}
          >
            {number}
          </div>
        )}

        <div className="flex-shrink-0">{renderImage()}</div>

        <div className="flex-grow-1 text-start min-w-0 overflow-hidden">
          {titleContent}

          {label && label.length > 0 && (
            <div className="text-custom-muted small text-truncate">
              {renderArtists()}
            </div>
          )}
        </div>

        {stat && (
          <div className="text-end flex-shrink-0" style={{ minWidth: '80px' }}>
            <div className="text-custom-muted small text-nowrap">{stat}</div>
          </div>
        )}
      </div>
    </Block>
  );
};

export default ElementBlock;
