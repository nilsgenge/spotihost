import React from "react";
import pageStyles from "../styles/page.module.scss";
import { FaExclamationTriangle } from "react-icons/fa";
import Separator from "../components/ui/Separator";
import ContentBlock from "../components/ui/ContentBlock";
import { useSettings } from "../hooks/useSettings";
import FileImportBlock from "../components/blocks/FileImportBlock";
import SettingItem from "../components/blocks/SettingsItem";

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
      <div className="container py-5 text-center">
        <div className="text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className={pageStyles.pageHeader}>
          <h1>Settings</h1>
        </div>
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
      <div className={pageStyles.pageHeader}>
        <h1>Settings</h1>
      </div>
      <Separator />

      <div className="row g-4">
        {/* General Settings */}
        <div className="col-12">
          <ContentBlock title="General Settings">
            <div className="row g-4">
              {/* Ingestion */}
              {settings.ingest_interval_minutes && (
                <div className="col-12 col">
                  <SettingItem
                    id="ingest_interval_minutes"
                    label="Ingestion Interval"
                    description="How often the application attempts to fetch new data from Spotify (in minutes)."
                    type="number"
                    value={localValues.ingest_interval_minutes || ""}
                    min={1}
                    max={999}
                    isSaving={savingKey === "ingest_interval_minutes"}
                    isSaved={savedKey === "ingest_interval_minutes"}
                    onChange={(val) =>
                      setLocalValue("ingest_interval_minutes", val)
                    }
                    onSave={() => saveSetting("ingest_interval_minutes")}
                    onReset={() => resetSetting("ingest_interval_minutes")}
                  />
                </div>
              )}
            </div>

            {/* Other Settings ... */}
          </ContentBlock>
        </div>

        {/* Imports */}
        <div className="col-12">
          <ContentBlock
            title="Import Listening History"
            description="Upload JSON files from your Spotify data export to view detailed history."
          >
            <FileImportBlock />
          </ContentBlock>
        </div>
      </div>
    </div>
  );
};

export default Settings;
