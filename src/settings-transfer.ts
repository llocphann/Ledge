import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";
import type { LedgeSettings } from "./types";

export const LEDGE_SETTINGS_FORMAT = "ledge-settings";
export const LEDGE_SETTINGS_SCHEMA_VERSION = 1;

interface LedgeSettingsEnvelope {
  format: typeof LEDGE_SETTINGS_FORMAT;
  schemaVersion: typeof LEDGE_SETTINGS_SCHEMA_VERSION;
  pluginVersion: string;
  exportedAt: string;
  settings: LedgeSettings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function serializeLedgeSettings(
  settings: LedgeSettings,
  pluginVersion: string,
  exportedAt = new Date(),
): string {
  const envelope: LedgeSettingsEnvelope = {
    format: LEDGE_SETTINGS_FORMAT,
    schemaVersion: LEDGE_SETTINGS_SCHEMA_VERSION,
    pluginVersion,
    exportedAt: exportedAt.toISOString(),
    settings: normalizeSettings(settings),
  };
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

export function parseLedgeSettingsImport(text: string): LedgeSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  if (!isRecord(parsed)) throw new Error("The imported file must contain a JSON object.");

  let settings: unknown = parsed;
  if ("format" in parsed || "schemaVersion" in parsed || "settings" in parsed) {
    if (parsed.format !== LEDGE_SETTINGS_FORMAT) {
      throw new Error("This settings file was not exported by Ledge.");
    }
    if (parsed.schemaVersion !== LEDGE_SETTINGS_SCHEMA_VERSION) {
      throw new Error(`Unsupported Ledge settings schema: ${String(parsed.schemaVersion)}.`);
    }
    settings = parsed.settings;
  } else if (!Object.keys(DEFAULT_SETTINGS).some((key) => key in parsed)) {
    throw new Error("This JSON object does not contain Ledge settings.");
  }
  if (!isRecord(settings)) throw new Error("The imported Ledge settings are missing.");
  return normalizeSettings(settings);
}
