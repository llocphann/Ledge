import { normalizeSettings, syncSelectedDockPreset } from "./settings";
import type {
  DockPresetSettings,
  LedgeSettings,
} from "./types";

export const LEDGE_DATA_SCHEMA_VERSION = 3 as const;

export interface CanonicalLedgeSettings {
  settingsSchemaVersion: typeof LEDGE_DATA_SCHEMA_VERSION;
  selectedDockId: string;
  docks: DockPresetSettings[];
}

function cloneDockPreset(dock: DockPresetSettings): DockPresetSettings {
  return {
    ...dock,
    items: dock.items.map((item) => ({ ...item })),
    includeRules: dock.includeRules.map((rule) => ({ ...rule })),
    excludeRules: dock.excludeRules.map((rule) => ({ ...rule })),
  };
}

/**
 * Projects runtime settings into the canonical persisted representation.
 *
 * Ledge 2.2.x keeps the selected Dock mirrored at the top level for the
 * declarative settings UI. Schema v3 deliberately does not persist that
 * duplicate state: the selected preset in `docks` is authoritative on disk.
 * A detached working copy is synchronized first so unsaved mirror edits are
 * represented without mutating the live runtime object.
 */
export function canonicalizeLedgeSettings(settings: LedgeSettings): CanonicalLedgeSettings {
  const working: LedgeSettings = {
    ...settings,
    items: settings.items.map((item) => ({ ...item })),
    includeRules: settings.includeRules.map((rule) => ({ ...rule })),
    excludeRules: settings.excludeRules.map((rule) => ({ ...rule })),
    docks: settings.docks.map(cloneDockPreset),
  };
  syncSelectedDockPreset(working);
  const normalized = normalizeSettings(working);

  return {
    settingsSchemaVersion: LEDGE_DATA_SCHEMA_VERSION,
    selectedDockId: normalized.selectedDockId,
    docks: normalized.docks.map(cloneDockPreset),
  };
}
