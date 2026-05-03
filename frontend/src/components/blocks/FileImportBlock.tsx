import React, { useState, useEffect } from "react";
import {
  FaUpload,
  FaCheckCircle,
  FaTimesCircle,
  FaTrash,
  FaRedo,
} from "react-icons/fa";
import Block from "../ui/Block";
import StatBlock from "../ui/StatBlock";
import styles from "./FileImportBlock.module.scss";

interface FileImportStatus {
  id: number;
  filename: string;
  status: "pending" | "processing" | "completed" | "failed";
  total_records?: number;
  imported_records?: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

interface ImportStats {
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  processing_jobs: number;
  total_records_imported: number;
}

const FileImportBlock: React.FC = () => {
  const [files, setFiles] = useState<FileImportStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchImportJobs();
    fetchStats();
  }, []);

  // Poll for progress updates on active jobs
  useEffect(() => {
    const activeJobs = files.filter(
      (f) => f.status === "pending" || f.status === "processing",
    );

    if (activeJobs.length === 0) return;

    const interval = setInterval(() => {
      activeJobs.forEach((job) => {
        pollJobStatus(job.id);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [files]);

  const fetchImportJobs = async () => {
    try {
      const response = await fetch(`/api/imports/jobs`);
      if (!response.ok) throw new Error("Failed to fetch jobs");
      const data = await response.json();
      setFiles(data);
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setError("Failed to load import jobs");
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/imports/stats`);
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const pollJobStatus = async (jobId: number) => {
    try {
      const response = await fetch(`/api/imports/jobs/${jobId}`);
      if (!response.ok) return;

      const updatedJob = await response.json();

      setFiles((prev) =>
        prev.map((file) => (file.id === jobId ? updatedJob : file)),
      );

      if (updatedJob.status === "completed" || updatedJob.status === "failed") {
        fetchStats();
      }
    } catch (err) {
      console.error(`Error polling job ${jobId}:`, err);
    }
  };

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || isUploading) return;

    setError(null);
    setIsUploading(true);

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (!file.name.endsWith(".json")) {
        setError(`Skipped ${file.name}: Only JSON files are supported`);
        continue;
      }
      await uploadFile(file);
    }

    setIsUploading(false);
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/imports/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      /* const result = await response.json(); */
      await fetchImportJobs();
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload file");
    }
  };

  const removeFile = async (fileId: number) => {
    if (
      !confirm(
        "Are you sure? This will delete the job and all imported listens.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/imports/jobs/${fileId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Delete failed");
      }

      setFiles((prev) => prev.filter((file) => file.id !== fileId));
      fetchStats();
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to delete job");
    }
  };

  const retryJob = async (fileId: number) => {
    try {
      const response = await fetch(`/api/imports/jobs/${fileId}/retry`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Retry failed");
      }

      await pollJobStatus(fileId);
    } catch (err: any) {
      console.error("Retry error:", err);
      setError(err.message || "Failed to retry job");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const getStatusIcon = (status: FileImportStatus["status"]) => {
    switch (status) {
      case "pending":
      case "processing":
        return (
          <div
            className="spinner-border spinner-border-sm text-primary"
            role="status"
          >
            <span className="visually-hidden">Loading...</span>
          </div>
        );
      case "completed":
        return <FaCheckCircle className="text-custom-success" />;
      case "failed":
        return <FaTimesCircle className="text-custom-danger" />;
    }
  };

  const formatDuration = (startedAt?: string, completedAt?: string): string => {
    if (!startedAt) return "";
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const seconds = Math.floor(durationMs / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const renderStatusText = (file: FileImportStatus) => {
    if (file.status === "pending") return "Waiting to start...";
    if (file.status === "processing")
      return `Importing... ${file.imported_records?.toLocaleString() || 0} / ${file.total_records?.toLocaleString() || "?"} records`;
    if (file.status === "completed")
      return `✓ ${file.imported_records?.toLocaleString()} records in ${formatDuration(file.started_at, file.completed_at)}`;
    if (file.status === "failed")
      return `Failed: ${file.error_message || "Unknown error"}`;
    return "";
  };

  return (
    <div>
      {error && (
        <div className="alert alert-danger alert-dismissible mb-3">
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError(null)}
          />
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="row g-4 mb-4">
          <div className="col-6 col-md-3">
            <StatBlock
              title="Total Imported"
              value={stats.total_records_imported.toLocaleString()}
            />
          </div>
          <div className="col-6 col-md-3">
            <StatBlock
              title="Completed"
              value={stats.completed_jobs.toString()}
            />
          </div>
          <div className="col-6 col-md-3">
            <StatBlock
              title="Processing"
              value={stats.processing_jobs.toString()}
            />
          </div>
          <div className="col-6 col-md-3">
            <StatBlock
              title="Failed"
              value={stats.failed_jobs.toString()}
            />
          </div>
        </div>
      )}

      {/* Drag and Drop Zone */}
      <div
        className={`border rounded p-4 text-center mb-3 ${styles.dropZone} ${
          isDragging ? "border-primary" : "border-secondary"
        } ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() =>
          !isUploading && document.getElementById("file-input")?.click()
        }
      >
        <FaUpload
          className={`fs-1 text-custom-muted mb-2 ${styles.dropIcon} ${
            isUploading ? "animate-pulse" : ""
          }`}
        />
        <p className={`mb-0 text-custom-muted ${styles.dropText}`}>
          {isUploading ? (
            "Uploading..."
          ) : (
            <>
              <span className="d-none d-md-inline">
                Drag and drop files here or{" "}
              </span>
              <span className="text-primary">
                <span className="d-none d-md-inline">click to browse</span>
                <span className="d-md-none">Tap to upload JSON</span>
              </span>
            </>
          )}
        </p>
        <input
          id="file-input"
          type="file"
          multiple
          accept=".json"
          onChange={(e) => handleFileSelect(e.target.files)}
          hidden
          disabled={isUploading}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <>
          <h6 className={`mb-2 text-custom-muted ${styles.sectionTitle}`}>
            Import Jobs ({files.length})
          </h6>
          <div className="d-flex flex-column gap-2">
            {files.map((file) => {
              const isActive =
                file.status === "processing" || file.status === "pending";

              return (
                <Block key={file.id} className={styles.jobItem}>
                  <div className="d-flex align-items-center gap-3 w-100 min-w-0">
                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {getStatusIcon(file.status)}
                    </div>

                    {/* Job Info */}
                    <div className="flex-grow-1 min-w-0 overflow-hidden">
                      <div className={`fw-bold text-truncate ${styles.filename}`}>
                        {file.filename}
                      </div>
                      <small className={`text-custom-muted text-truncate d-block ${styles.statusText}`}>
                        {renderStatusText(file)}
                      </small>
                      {file.status === "failed" && file.error_message && (
                        <div className={`mt-1 text-custom-danger text-truncate small ${styles.statusText}`}>
                          {file.error_message}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="text-end flex-shrink-0">
                      <div className="d-flex gap-2 justify-content-end">
                        {file.status === "failed" && (
                          <button
                            className={`btn btn-sm btn-outline-custom ${styles.actionButton}`}
                            onClick={() => retryJob(file.id)}
                            title="Retry import"
                          >
                            <FaRedo />
                          </button>
                        )}

                        <button
                          className={`btn btn-sm btn-outline-custom ${styles.actionButton}`}
                          onClick={() => removeFile(file.id)}
                          disabled={isActive}
                          title={
                            isActive
                              ? "Cannot delete while processing"
                              : "Delete job"
                          }
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                </Block>
              );
            })}
          </div>
        </>
      )}

      {files.length === 0 && !isUploading && (
        <Block>
          <div className="text-center text-custom-muted py-2">
            No import jobs yet. Upload your Spotify listening history to get
            started.
          </div>
        </Block>
      )}
    </div>
  );
};

export default FileImportBlock;
