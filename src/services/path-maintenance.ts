import type { DockPresetSettings, LedgeSettings } from "../types";

export interface PathMaintenanceResult {
  changed: boolean;
  affectedDockIds: string[];
}

function renamePath(value: string, newPath: string, oldPath: string): string {
  return value === oldPath || value.startsWith(`${oldPath}/`)
    ? newPath + value.slice(oldPath.length)
    : value;
}

function maintainDockRename(
  dock: DockPresetSettings,
  newPath: string,
  oldPath: string,
): boolean {
  let changed = false;

  for (const rule of [...dock.includeRules, ...dock.excludeRules]) {
    if (rule.matchType !== "path" && rule.matchType !== "folder") continue;
    const next = renamePath(rule.matchValue, newPath, oldPath);
    if (next === rule.matchValue) continue;
    rule.matchValue = next;
    changed = true;
  }

  for (const item of dock.items) {
    const target = renamePath(item.target, newPath, oldPath);
    if (target !== item.target) {
      item.target = target;
      changed = true;
    }

    const rememberedIcon = renamePath(item.vaultIconPath, newPath, oldPath);
    if (rememberedIcon !== item.vaultIconPath) {
      item.vaultIconPath = rememberedIcon;
      changed = true;
    }

    if (item.iconSource === "vault") {
      const activeIcon = renamePath(item.icon, newPath, oldPath);
      if (activeIcon !== item.icon) {
        item.icon = activeIcon;
        changed = true;
      }
      if (item.vaultIconPath && item.icon !== item.vaultIconPath) {
        item.icon = item.vaultIconPath;
        changed = true;
      }
    }
  }

  return changed;
}

/**
 * Applies one vault rename transaction to the canonical Dock preset list.
 * Disabled presets are deliberately included so their stored paths remain
 * correct without keeping a hidden DockController alive.
 */
export function maintainRenamedVaultPaths(
  settings: LedgeSettings,
  newPath: string,
  oldPath: string,
): PathMaintenanceResult {
  const affectedDockIds: string[] = [];

  for (const dock of settings.docks) {
    if (maintainDockRename(dock, newPath, oldPath)) affectedDockIds.push(dock.id);
  }

  return {
    changed: affectedDockIds.length > 0,
    affectedDockIds,
  };
}
