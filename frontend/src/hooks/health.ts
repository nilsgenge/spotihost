import { useState, useEffect, useCallback } from "react";

export interface HealthCheck {
  status: "healthy" | "unhealthy";
  checks: {
    backend: {
      status: "healthy" | "unhealthy";
      timestamp: string;
    };
    database: {
      status: "healthy" | "unhealthy" | "unknown";
      latency_ms: number | null;
      error?: string;
    };
  };
}

interface UseHealthCheckReturn {
  health: HealthCheck | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isHealthy: boolean;
  isDatabaseHealthy: boolean;
  isBackendHealthy: boolean;
  isBackendReachable: boolean;
  networkError: Error | null;
}

export function useHealthCheck(): UseHealthCheckReturn {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [networkError, setNetworkError] = useState<Error | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNetworkError(null);
      const response = await fetch(`/api/health`);
      const data: HealthCheck = await response.json();
      setHealth(data);
      setNetworkError(null);
    } catch (err) {
      // Network error means backend is completely unreachable
      const error = err instanceof Error ? err : new Error("Failed to fetch health status");
      setNetworkError(error);
      setHealth(null);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const isHealthy = health?.status === "healthy";
  const isDatabaseHealthy = health?.checks.database.status === "healthy";
  const isBackendHealthy = health?.checks.backend.status === "healthy";
  const isBackendReachable = networkError === null;

  return {
    health,
    loading,
    error,
    refetch: fetchHealth,
    isHealthy,
    isDatabaseHealthy,
    isBackendHealthy,
    isBackendReachable,
    networkError,
  };
}
