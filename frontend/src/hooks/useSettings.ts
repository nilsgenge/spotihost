import { useState, useEffect, useCallback } from "react";

interface SettingData {
  value: string;
  type: string;
  description: string | null;
  default_value: string | null;
}

interface Settings {
  [key: string]: SettingData;
}

export interface UseSettingsReturn {
  settings: Settings;
  loading: boolean;
  savingKey: string | null;
  savedKey: string | null;
  error: string | null;
  localValues: { [key: string]: string };
  setLocalValue: (key: string, value: string) => void;
  saveSetting: (key: string, newValue?: string) => Promise<void>;
  resetSetting: (key: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useSettings = (): UseSettingsReturn => {
  const [settings, setSettings] = useState<Settings>({});
  const [localValues, setLocalValues] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/settings/`);

      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status}`);
      }

      const data = await response.json();
      setSettings(data);

      // Initialize local values with fetched data
      const initialLocalValues: { [key: string]: string } = {};
      Object.keys(data).forEach((key) => {
        initialLocalValues[key] = data[key].value;
      });
      setLocalValues(initialLocalValues);
    } catch (err) {
      console.error("Failed to fetch settings:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  }, [`/api/`]);

  const setLocalValue = useCallback((key: string, value: string) => {
    setLocalValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const saveSetting = useCallback(
    async (key: string, newValue?: string) => {
      const value = newValue ?? localValues[key];

      // Don't save if value hasn't changed
      if (settings[key]?.value === value) {
        return;
      }

      setSavingKey(key);
      setSavedKey(null);
      setError(null);

      try {
        const response = await fetch(`/api/settings/${key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update setting: ${response.status}`);
        }

        setSettings((prev) => ({
          ...prev,
          [key]: { ...prev[key], value },
        }));

        // Update local value to match saved value
        setLocalValues((prev) => ({
          ...prev,
          [key]: value,
        }));

        setSavedKey(key);
        setTimeout(() => setSavedKey(null), 2000);
      } catch (err) {
        console.error("Failed to update setting:", err);
        setError(
          err instanceof Error ? err.message : "Failed to update setting",
        );

        // Revert local value on error
        setLocalValues((prev) => ({
          ...prev,
          [key]: settings[key]?.value || "",
        }));
      } finally {
        setSavingKey(null);
      }
    },
    [`/api/`, localValues, settings],
  );

  const resetSetting = useCallback(
    async (key: string) => {
      setSavingKey(key);
      setSavedKey(null);
      setError(null);

      try {
        const response = await fetch(`/api/settings/${key}/reset`, {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error(`Failed to reset setting: ${response.status}`);
        }

        const data = await response.json();

        setSettings((prev) => ({
          ...prev,
          [key]: { ...prev[key], value: data.value },
        }));

        setLocalValues((prev) => ({
          ...prev,
          [key]: data.value,
        }));

        setSavedKey(key);
        setTimeout(() => setSavedKey(null), 2000);
      } catch (err) {
        console.error("Failed to reset setting:", err);
        setError(
          err instanceof Error ? err.message : "Failed to reset setting",
        );
      } finally {
        setSavingKey(null);
      }
    },
    [`/api/`],
  );

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    savingKey,
    savedKey,
    error,
    localValues,
    setLocalValue,
    saveSetting,
    resetSetting,
    refetch: fetchSettings,
  };
};
