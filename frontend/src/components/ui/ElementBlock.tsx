import React from "react";
import { FaQuestion } from "react-icons/fa";
import Block from "./Block";

interface ElementBlockProps {
  image?: string | undefined;
  title: string;
  label?: string;
  stat?: string;
}

const ElementBlock: React.FC<ElementBlockProps> = ({
  image,
  title,
  label,
  stat,
}) => {
  const baseClasses =
    "icon-square d-flex align-items-center justify-content-center";

  const renderImage = () => {
    if (image) {
      return (
        <div
          className={`${baseClasses} rounded-2`}
          style={{
            backgroundImage: `url(${image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            width: "3.2rem",
            height: "3.2rem",
          }}
        />
      );
    }

    return (
      <div className={`${baseClasses} rounded bg-primary text-white`}>
        <FaQuestion />
      </div>
    );
  };

  return (
    <Block fullWidth>
      <div className="d-flex align-items-center gap-3">
        <div className="flex-shrink-0">{renderImage()}</div>
        <div className="flex-grow-1 text-start">
          <div className="fw-bold">{title}</div>
          {label && <div className="text-custom-muted small">{label}</div>}
        </div>
        <div className="text-end">
          <div className="text-custom-muted small">{stat}</div>
        </div>
      </div>
    </Block>
  );
};

export default ElementBlock;
