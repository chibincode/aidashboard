export const SETTINGS_TOAST_COOKIE = "settings-toast";

export type SettingsToast = {
  id: string;
  message: string;
};

export function createSettingsToast(message: string): SettingsToast {
  return {
    id: crypto.randomUUID(),
    message,
  };
}

export function serializeSettingsToast(toast: SettingsToast) {
  return encodeURIComponent(JSON.stringify(toast));
}

export function parseSettingsToast(value: string | undefined): SettingsToast | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<SettingsToast>;

    if (typeof parsed.id !== "string" || typeof parsed.message !== "string") {
      return null;
    }

    return {
      id: parsed.id,
      message: parsed.message,
    };
  } catch {
    return null;
  }
}
