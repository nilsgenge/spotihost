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
}

const ElementBlock: React.FC<ElementBlockProps> = ({
  image,
  title,
  label,
  stat,
  title_url,
}) => {
  const renderImage = () => {
    if (image) {
      return (
        <div
          className="element-cover rounded-2"
          style={{ backgroundImage: `url(${image})` }}
        />
      );
    }

    return (
      <div className="element-cover rounded bg-primary text-white d-flex align-items-center justify-content-center">
        <FaQuestion />
      </div>
    );
  };

  const renderArtists = () => {
    if (!label || label.length === 0) return null;

    return label.map((artist, index) => {
      const isLast = index === label.length - 1;

      return (
        <React.Fragment key={index}>
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

  return (
    <Block fullWidth>
      <div className="d-flex align-items-center gap-3">
        <div className="flex-shrink-0">{renderImage()}</div>
        <div className="flex-grow-1 text-start">
          {title_url ? (
            <Link to={title_url} className="fw-bold text-reset hover-underline">
              {title}
            </Link>
          ) : (
            <div className="fw-bold">{title}</div>
          )}

          {label && label.length > 0 && (
            <div className="text-custom-muted small">{renderArtists()}</div>
          )}
        </div>
        <div className="text-end">
          <div className="text-custom-muted small">{stat}</div>
        </div>
      </div>
    </Block>
  );
};

export default ElementBlock;
