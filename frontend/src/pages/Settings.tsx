import React from "react";
import { FaUndo, FaCheck, FaExclamationTriangle } from "react-icons/fa";
import Separator from "../components/ui/Separator";
import { useSettings } from "../hooks/useSettings";

const Settings: React.FC = () => {
  const {
    settings,
    loading,
    savingKey,
    savedKey,
    error,
    localValues,
    setLocalValue,
    saveSetting,
    resetSetting,
  } = useSettings();

  if (loading) {
    return (
      <div className="container">
        <h1>Settings</h1>
        <Separator />
        <div className="text-center py-5">
          <div className="text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <h1>Settings</h1>
        <Separator />
        <div className="alert alert-danger d-flex align-items-center">
          <FaExclamationTriangle className="me-2" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Settings</h1>
      <Separator />

      {/* Ingestion Settings */}
      {settings.ingest_interval_minutes && (
        <div className="block p-4 mb-4">
          <div className="d-flex justify-content-between align-items-start">
            <div className="flex-grow-1">
              <h5 className="mb-1">Ingestion Interval</h5>
              <small className="text-custom-muted">
                How often the application attempts to fetch new data from
                Spotify (in minutes)
              </small>
            </div>

            <div className="d-flex align-items-center gap-2">
              <input
                type="number"
                className="form-control text-end"
                style={{ width: "80px" }}
                value={localValues.ingest_interval_minutes || ""}
                onChange={(e) =>
                  setLocalValue("ingest_interval_minutes", e.target.value)
                }
                onBlur={() => saveSetting("ingest_interval_minutes")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                    saveSetting("ingest_interval_minutes");
                  }
                }}
                min="1"
                max="999"
                disabled={savingKey === "ingest_interval_minutes"}
              />
              {savingKey === "ingest_interval_minutes" && (
                <div className="text-primary" role="status">
                  <span className="visually-hidden">Saving...</span>
                </div>
              )}
              {savedKey === "ingest_interval_minutes" && (
                <FaCheck className="text-custom-success" />
              )}
              <button
                className="btn btn-sm btn-outline-custom"
                onClick={() => resetSetting("ingest_interval_minutes")}
                disabled={savingKey === "ingest_interval_minutes"}
                title="Reset to default"
              >
                <FaUndo />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
