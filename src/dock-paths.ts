import type { LedgeSettings } from "./types";

function renamePath(value: string, newPath: string, oldPath: string): string {
  return value === oldPath || value.startsWith(`${oldPath}/`)
    ? newPath + value.slice(oldPath.length)
    : value;
}

/**
 * Vault icon paths are remembered even while an item temporarily uses a
 * built-in icon. Keep that inactive path current so switching back never
 * resurrects a stale file name after a vault rename.
 */
export function renameRememberedVaultIconPaths(
  settings: LedgeSettings,
  newPath: string,
  oldPath: string,
): boolean {
  let changed = false;
  for (const dock of settings.docks) {
    for (const item of dock.items) {
      const renamed = renamePath(item.vaultIconPath, newPath, oldPath);
      if (renamed === item.vaultIconPath) continue;
      item.vaultIconPath = renamed;
      if (item.iconSource === "vault") item.icon = renamed;
      changed = true;
    }
  }
  return changed;
}
