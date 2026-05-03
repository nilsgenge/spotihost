import { type FC } from "react";
import { FaUndo, FaCheck } from "react-icons/fa";
import ContentBlock from "../ui/ContentBlock";
import styles from "./SettingsItem.module.scss";

interface SettingItemProps {
  id: string;
  label: string;
  description: string;
  type: "number" | "text";
  value: string | number;
  min?: number;
  max?: number;
  isSaving: boolean;
  isSaved: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onReset: () => void;
}

const SettingItem: FC<SettingItemProps> = ({
  id,
  label,
  description,
  type,
  value,
  min,
  max,
  isSaving,
  isSaved,
  onChange,
  onSave,
  onReset,
}) => {
  return (
    <div className="h-100">
      <ContentBlock title={label} className="w-100">
        <div className={styles.row}>
          <div className="text-start">
            <small className={`text-custom-muted ${styles.description}`}>
              {description}
            </small>
          </div>

          <div className={styles.controls}>
            <input
              id={id}
              type={type}
              className={`form-control ${styles.input}`}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                  onSave();
                }
              }}
              min={min}
              max={max}
              disabled={isSaving}
            />

            {isSaving && (
              <div className="text-primary align-self-center" role="status">
                <span className="visually-hidden">Saving...</span>
              </div>
            )}

            {isSaved && !isSaving && (
              <FaCheck className="text-custom-success align-self-center" />
            )}

            <button
              className={`btn btn-sm btn-outline-custom ${styles.resetButton}`}
              onClick={onReset}
              disabled={isSaving}
              title="Reset to default"
              aria-label="Reset to default"
            >
              <FaUndo />
            </button>
          </div>
        </div>
      </ContentBlock>
    </div>
  );
};

export default SettingItem;
