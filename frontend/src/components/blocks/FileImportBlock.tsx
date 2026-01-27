import React, { useState, useEffect } from "react";
import {
  FaUpload,
  FaCheckCircle,
  FaSpinner,
  FaTimesCircle,
  FaTrash,
  FaRedo,
} from "react-icons/fa";

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

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const FileImportBlock: React.FC = () => {
  const [files, setFiles] = useState<FileImportStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch all import jobs on mount
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
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [files]);

  const fetchImportJobs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/imports/jobs`);
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
      const response = await fetch(`${API_BASE_URL}/imports/stats`);
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const pollJobStatus = async (jobId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/imports/jobs/${jobId}`);
      if (!response.ok) return;

      const updatedJob = await response.json();

      setFiles((prev) =>
        prev.map((file) => (file.id === jobId ? updatedJob : file)),
      );

      // Refresh stats if job completed or failed
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

    // Upload files sequentially
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      // Validate file type
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
      const response = await fetch(`${API_BASE_URL}/imports/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      const result = await response.json();

      // Refresh job list
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
      const response = await fetch(`${API_BASE_URL}/imports/jobs/${fileId}`, {
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
      const response = await fetch(
        `${API_BASE_URL}/imports/jobs/${fileId}/retry`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Retry failed");
      }

      // Job will be updated via polling
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
          <div className="spinner-border spinner-border-sm text-primary" />
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

  const dragClasses = `
  border border-2 rounded p-4 text-center mb-3
  ${isDragging ? "border-primary" : "border-secondary"}
  ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
`;

  const hasFiles = files.length > 0;

  const renderStat = (
    label: string,
    value: React.ReactNode,
    valueClass = "",
  ) => (
    <div className="col-6 col-md-3">
      <div className="text-center p-2 block">
        <small className="text-custom-muted d-block">{label}</small>
        <strong className={`fs-5 ${valueClass}`}>{value}</strong>
      </div>
    </div>
  );

  const renderStatusText = (file: any) => {
    if (file.status === "pending") return "Waiting to start...";

    if (file.status === "processing")
      return `Importing... ${file.imported_records?.toLocaleString() || 0} / ${file.total_records?.toLocaleString() || "?"} records`;

    if (file.status === "completed")
      return `✓ ${file.imported_records?.toLocaleString()} records in ${formatDuration(file.started_at, file.completed_at)}`;

    if (file.status === "failed")
      return `Failed: ${file.error_message || "Unknown error"}`;
  };

  return (
    <div className="block p-4 mb-4">
      <header className="mb-3">
        <h5 className="mb-1">Import Listening History</h5>
        <small className="text-custom-muted">
          Upload JSON files from your Spotify data export
        </small>
      </header>

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

      {stats && (
        <div className="row mb-3">
          {renderStat(
            "Total Imported",
            stats.total_records_imported.toLocaleString(),
            "text-custom-success",
          )}
          {renderStat("Completed", stats.completed_jobs, "text-custom-success")}
          {renderStat("Processing", stats.processing_jobs, "text-primary")}
          {renderStat("Failed", stats.failed_jobs, "text-custom-danger")}
        </div>
      )}

      <div
        className={dragClasses}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() =>
          !isUploading && document.getElementById("file-input")?.click()
        }
      >
        <FaUpload
          className={`fs-1 text-custom-muted mb-2 ${isUploading ? "animate-pulse" : ""}`}
        />

        <p className="mb-0 text-custom-muted">
          {isUploading ? (
            "Uploading..."
          ) : (
            <>
              Drag and drop files here or{" "}
              <span className="text-primary">click to browse</span>
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

      {hasFiles && (
        <>
          <h6 className="mb-2">Import Jobs ({files.length})</h6>

          <div className="list-group list-group-flush">
            {files.map((file) => {
              const isActive =
                file.status === "processing" || file.status === "pending";

              return (
                <div
                  key={file.id}
                  className="list-group-item bg-transparent text-white border-secondary"
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="d-flex align-items-center gap-2 flex-grow-1">
                      {getStatusIcon(file.status)}

                      <div className="flex-grow-1">
                        <div className="fw-bold text-truncate w-75">
                          {file.filename}
                        </div>

                        <small className="text-custom-muted">
                          {renderStatusText(file)}
                        </small>
                      </div>
                    </div>

                    <div className="d-flex gap-2">
                      {file.status === "failed" && (
                        <button
                          className="btn btn-sm btn-outline-custom"
                          onClick={() => retryJob(file.id)}
                        >
                          <FaRedo />
                        </button>
                      )}

                      <button
                        className="btn btn-sm btn-outline-custom"
                        onClick={() => removeFile(file.id)}
                        disabled={isActive}
                        title={
                          isActive
                            ? "Cannot delete while processing"
                            : "Delete job and all imported data"
                        }
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>

                  {file.status === "failed" && file.error_message && (
                    <div className="mt-2 p-2 bg-danger bg-opacity-10 rounded">
                      <small className="text-danger">
                        {file.error_message}
                      </small>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!hasFiles && !isUploading && (
        <div className="text-center text-custom-muted py-4">
          No import jobs yet. Upload your Spotify listening history to get
          started.
        </div>
      )}
    </div>
  );
};

export default FileImportBlock;
