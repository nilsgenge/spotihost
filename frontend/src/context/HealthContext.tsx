import React, { createContext, useContext, type ReactNode } from "react";
import { useHealthCheck, type HealthCheck } from "../hooks/health";
import Status from "../components/ui/Status";

interface HealthContextType {
  health: HealthCheck | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isHealthy: boolean;
  isDatabaseHealthy: boolean;
  isBackendHealthy: boolean;
  isBackendReachable: boolean;
  networkError: Error | null;
  statusComponent: ReactNode | null;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export const HealthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const healthData = useHealthCheck();

  let statusComponent: ReactNode | null = null;

  if (healthData.loading) {
    statusComponent = (
      <div className="text-center" style={{ padding: "40px" }}>Loading...</div>
    );
  } else if (!healthData.isBackendReachable) {
    // Backend is completely unreachable (network error)
    statusComponent = (
      <div
        className="d-flex flex-column align-items-center gap-3"
        style={{ padding: "40px 20px" }}
      >
        <Status
          text="Backend service is unreachable. Please check if the backend is running."
          status="deactivated"
        />
        {healthData.networkError && (
          <details className="text-muted small">
            <summary>Debug info</summary>
            <code className="d-block mt-2 text-danger small">
              {healthData.networkError.message}
            </code>
          </details>
        )}
      </div>
    );
  } else if (!healthData.isDatabaseHealthy && healthData.health) {
    // Backend reachable but database is down
    statusComponent = (
      <div
        className="d-flex flex-column align-items-center gap-3"
        style={{ padding: "40px 20px" }}
      >
        <Status
          text="Database connection failed. Please check if the database is running."
          status="deactivated"
        />
        {healthData.health.checks.database.error && (
          <details className="text-muted small">
            <summary>Debug info</summary>
            <div className="d-flex flex-column gap-2 mt-2">
              <div>
                <small className="text-muted">Latency:</small>{" "}
                <code>{healthData.health.checks.database.latency_ms}ms</code>
              </div>
              <div>
                <small className="text-muted">Error:</small>{" "}
                <code className="text-danger small">
                  {healthData.health.checks.database.error}
                </code>
              </div>
            </div>
          </details>
        )}
      </div>
    );
  }

  const value = {
    ...healthData,
    statusComponent,
  };

  return (
    <HealthContext.Provider value={value}>{children}</HealthContext.Provider>
  );
};

export const useHealth = (): HealthContextType => {
  const context = useContext(HealthContext);
  if (context === undefined) {
    throw new Error("useHealth must be used within a HealthProvider");
  }
  return context;
};
