export const getBrowserTimeZone = (): string | null => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
};

export const toUtcIso = (date: Date): string => {
  return date.toISOString();
};
