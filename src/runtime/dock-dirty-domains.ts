import type { DockItemSettings, DockSettings } from "../types";

export const DOCK_DIRTY_DOMAINS = [
  "STYLE",
  "GEOMETRY",
  "VISIBILITY",
  "ITEMS",
  "ICONS",
  "POSITION",
] as const;

export type DockDirtyDomain = (typeof DOCK_DIRTY_DOMAINS)[number];

const STYLE_KEYS = [
  "showLabels",
  "radius",
  "showTrigger",
  "triggerAreaShowBackground",
  "triggerAreaShowBorder",
  "triggerAreaSurfaceMode",
  "triggerAreaSurfaceOpacity",
  "triggerAreaSurfaceColor",
  "triggerAreaGradientStart",
  "triggerAreaGradientEnd",
  "triggerAreaGradientAngle",
  "triggerAreaRadius",
  "triggerAreaBorderWidth",
  "triggerAreaBorderColor",
  "triggerSurfaceThickness",
  "triggerShowBackground",
  "triggerShowBorder",
  "triggerSurfaceMode",
  "triggerSurfaceOpacity",
  "triggerSurfaceColor",
  "triggerGradientStart",
  "triggerGradientEnd",
  "triggerGradientAngle",
  "triggerRadius",
  "triggerBorderWidth",
  "triggerBorderColor",
  "motionDuration",
  "magnification",
  "magnificationScale",
  "neighborScale",
  "showDockBackground",
  "showDockBorder",
  "surfaceMode",
  "surfaceOpacity",
  "surfaceColor",
  "gradientStart",
  "gradientEnd",
  "gradientAngle",
  "accentColor",
  "borderColor",
] as const satisfies readonly (keyof DockSettings)[];

const GEOMETRY_KEYS = [
  "itemSize",
  "gap",
  "padding",
  "edgeOffset",
  "triggerSize",
  "triggerLength",
] as const satisfies readonly (keyof DockSettings)[];

function changedKeys(
  previous: DockSettings,
  next: DockSettings,
  keys: readonly (keyof DockSettings)[],
): boolean {
  return keys.some((key) => previous[key] !== next[key]);
}

function sameItemStructure(left: DockItemSettings[], right: DockItemSettings[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((item, index) => {
    const other = right[index];
    return Boolean(other)
      && item.id === other.id
      && item.enabled === other.enabled
      && item.label === other.label
      && item.target === other.target;
  });
}

function sameItemIcons(left: DockItemSettings[], right: DockItemSettings[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((item, index) => {
    const other = right[index];
    return Boolean(other)
      && item.id === other.id
      && item.iconSource === other.iconSource
      && item.icon === other.icon
      && item.builtInIcon === other.builtInIcon
      && item.vaultIconPath === other.vaultIconPath
      && item.iconRenderMode === other.iconRenderMode
      && item.iconSize === other.iconSize
      && item.iconColor === other.iconColor
      && item.tileGradientStart === other.tileGradientStart
      && item.tileGradientEnd === other.tileGradientEnd;
  });
}

function sameRules(previous: DockSettings, next: DockSettings): boolean {
  return JSON.stringify(previous.includeRules) === JSON.stringify(next.includeRules)
    && JSON.stringify(previous.excludeRules) === JSON.stringify(next.excludeRules);
}

export function classifyDockChanges(
  previous: DockSettings | null,
  next: DockSettings,
): Set<DockDirtyDomain> {
  if (!previous) return new Set(DOCK_DIRTY_DOMAINS);

  const dirty = new Set<DockDirtyDomain>();

  if (previous.position !== next.position) {
    dirty.add("POSITION");
    dirty.add("GEOMETRY");
  }
  if (previous.enabled !== next.enabled
    || previous.autoHide !== next.autoHide
    || !sameRules(previous, next)) {
    dirty.add("VISIBILITY");
  }
  if (changedKeys(previous, next, GEOMETRY_KEYS)) dirty.add("GEOMETRY");
  if (changedKeys(previous, next, STYLE_KEYS)) dirty.add("STYLE");
  if (!sameItemStructure(previous.items, next.items)) dirty.add("ITEMS");
  if (previous.iconSize !== next.iconSize || !sameItemIcons(previous.items, next.items)) {
    dirty.add("ICONS");
  }

  return dirty;
}
