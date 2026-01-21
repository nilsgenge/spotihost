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
      <div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>
    );
  } else if (!healthData.isBackendHealthy || !healthData.isDatabaseHealthy) {
    statusComponent = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
          padding: "40px 20px",
        }}
      >
        {!healthData.isBackendHealthy && (
          <Status
            text="Error connecting to backend service."
            status="deactivated"
          />
        )}
        {!healthData.isDatabaseHealthy && (
          <Status text="Error connecting to database." status="deactivated" />
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
