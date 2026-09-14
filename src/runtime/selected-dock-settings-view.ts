import type { DockPresetSettings, DockSettings, LedgeSettings } from "../types";

const PRESET_METADATA_KEYS = new Set(["id", "name"]);

type MutableRecord = Record<string, unknown>;

function selectedDock(settings: LedgeSettings): DockPresetSettings {
  return settings.docks.find((dock) => dock.id === settings.selectedDockId)
    ?? settings.docks[0]!;
}

/**
 * Removes the selected-Dock data mirror from a normalized settings object and
 * replaces it with non-enumerable accessors backed directly by the canonical
 * preset in `docks`.
 *
 * Existing settings UI code can keep reading/writing `settings.itemSize`,
 * `settings.items`, etc. without maintaining a second copy of those values.
 * Switching `selectedDockId` immediately changes what those accessors expose.
 */
export function attachSelectedDockSettingsView(settings: LedgeSettings): LedgeSettings {
  const firstDock = settings.docks[0];
  if (!firstDock) return settings;

  const settingsRecord = settings as unknown as MutableRecord;
  const dockKeys = Object.keys(firstDock)
    .filter((key) => !PRESET_METADATA_KEYS.has(key)) as Array<keyof DockSettings>;

  for (const key of dockKeys) {
    delete settingsRecord[key];
    Object.defineProperty(settings, key, {
      configurable: true,
      enumerable: false,
      get: () => selectedDock(settings)[key],
      set: (value: DockSettings[typeof key]) => {
        selectedDock(settings)[key] = value as never;
      },
    });
  }

  return settings;
}

export function isSelectedDockSettingsView(settings: LedgeSettings): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(settings, "itemSize");
  return typeof descriptor?.get === "function"
    && typeof descriptor.set === "function"
    && descriptor.enumerable === false;
}
