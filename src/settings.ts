import {
  DOCK_POSITIONS,
  CONTEXT_MATCH_TYPES,
  ICON_RENDER_MODES,
  ICON_SOURCES,
  SURFACE_MODES,
  type DockItemSettings,
  type DockVisibilityRule,
  type DockPosition,
  type IconRenderMode,
  type IconSource,
  type LedgeSettings,
  type SurfaceMode,
} from "./types";

interface LegacyHotCornerSettings {
  hotCornerShowBackground?: unknown;
  hotCornerShowBorder?: unknown;
  hotCornerSurfaceMode?: unknown;
  hotCornerSurfaceOpacity?: unknown;
  hotCornerSurfaceColor?: unknown;
  hotCornerGradientStart?: unknown;
  hotCornerGradientEnd?: unknown;
  hotCornerGradientAngle?: unknown;
  hotCornerRadius?: unknown;
  hotCornerBorderWidth?: unknown;
  hotCornerBorderColor?: unknown;
}

type SettingsInput = Partial<LedgeSettings> & LegacyHotCornerSettings;

const DEFAULT_ITEMS: DockItemSettings[] = [
  dockItem("finance", "Finance", "Finance_Dashboard.md", "landmark"),
  dockItem("contacts", "Contacts", "Contact_Tracker.base", "contact"),
  dockItem("documents", "Documents", "Instructional_Documents.base", "notebook-tabs"),
  dockItem("training", "Training", "Bodybuilding.base", "dumbbell"),
  dockItem("media", "Media", "Media_Tracker.base", "clapperboard"),
  dockItem("games", "Games", "Games.base", "gamepad-2"),
  dockItem("books", "Books", "Book_Tracker.base", "library"),
  dockItem("fashion", "Fashion", "Fashion.base", "shirt"),
  dockItem("food", "Food & drinks", "FoodnDrinks.base", "utensils"),
];

export const DEFAULT_SETTINGS: LedgeSettings = {
  enabled: true,
  position: "left",
  autoHide: true,
  showLabels: true,
  itemSize: 44,
  iconSize: 30,
  gap: 7,
  padding: 8,
  radius: 18,
  edgeOffset: 0,
  showTrigger: true,
  triggerSize: 14,
  triggerLength: 86,
  triggerAreaShowBackground: true,
  triggerAreaShowBorder: false,
  triggerAreaSurfaceMode: "theme",
  triggerAreaSurfaceOpacity: 100,
  triggerAreaSurfaceColor: "#1f2937",
  triggerAreaGradientStart: "#1f2937",
  triggerAreaGradientEnd: "#111827",
  triggerAreaGradientAngle: 145,
  triggerAreaRadius: 0,
  triggerAreaBorderWidth: 1,
  triggerAreaBorderColor: "",
  triggerSurfaceThickness: 5,
  triggerShowBackground: true,
  triggerShowBorder: true,
  triggerSurfaceMode: "theme",
  triggerSurfaceOpacity: 72,
  triggerSurfaceColor: "#1f2937",
  triggerGradientStart: "#334155",
  triggerGradientEnd: "#111827",
  triggerGradientAngle: 145,
  triggerRadius: 12,
  triggerBorderWidth: 1,
  triggerBorderColor: "",
  revealDelay: 120,
  hideDelay: 650,
  motionDuration: 220,
  magnification: true,
  magnificationScale: 1.35,
  neighborScale: 1.14,
  showDockBackground: true,
  showDockBorder: true,
  surfaceMode: "theme",
  surfaceOpacity: 88,
  surfaceColor: "#1f2937",
  gradientStart: "#334155",
  gradientEnd: "#111827",
  gradientAngle: 145,
  accentColor: "",
  borderColor: "",
  includeRules: [],
  excludeRules: [],
  items: DEFAULT_ITEMS,
};

function dockItem(id: string, label: string, target: string, icon: string): DockItemSettings {
  return {
    id,
    enabled: true,
    label,
    target,
    iconSource: "lucide",
    icon,
    iconRenderMode: "tint",
    iconSize: 0,
    iconColor: "",
    tileGradientStart: "",
    tileGradientEnd: "",
  };
}

function clamp(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(maximum, Math.max(minimum, numeric));
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function stringValue(value: unknown, fallback = "", maximumLength = 240): string {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : fallback;
}

function colorValue(value: unknown, fallback = ""): string {
  const color = stringValue(value, fallback, 16);
  if (!color) return "";
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)
    ? color
    : fallback;
}

function enumValue<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === "string" && values.includes(value as T) ? value as T : fallback;
}

function cloneDefaultItems(): DockItemSettings[] {
  return DEFAULT_ITEMS.map((item) => ({ ...item }));
}

function normalizeItem(value: unknown, index: number, usedIds: Set<string>): DockItemSettings | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<DockItemSettings>;
  const fallbackId = `item-${index + 1}`;
  const baseId = stringValue(source.id, fallbackId, 80) || fallbackId;
  let id = baseId;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);

  return {
    id,
    enabled: booleanValue(source.enabled, true),
    label: stringValue(source.label, `Item ${index + 1}`, 120),
    target: stringValue(source.target, "", 500),
    iconSource: enumValue<IconSource>(source.iconSource, ICON_SOURCES, "lucide"),
    icon: stringValue(source.icon, "circle", 500),
    iconRenderMode: enumValue<IconRenderMode>(source.iconRenderMode, ICON_RENDER_MODES, "tint"),
    iconSize: clamp(source.iconSize, 0, 0, 96),
    iconColor: colorValue(source.iconColor),
    tileGradientStart: colorValue(source.tileGradientStart),
    tileGradientEnd: colorValue(source.tileGradientEnd),
  };
}

function normalizeRuleMatchValue(value: unknown, matchType: DockVisibilityRule["matchType"]): string {
  const raw = stringValue(value, "", 500);
  if (matchType === "tag") return raw.replace(/^#+/, "");
  if (matchType === "note") return raw.replace(/\.md$/i, "");
  return raw.replaceAll("\\", "/").replace(/\/{2,}/g, "/").replace(/^\.\//, "").replace(/\/$/, "");
}

function normalizeVisibilityRules(value: unknown, prefix: string): DockVisibilityRule[] {
  if (!Array.isArray(value)) return [];
  const usedIds = new Set<string>();
  return value.slice(0, 96).flatMap((candidate, index) => {
    if (!candidate || typeof candidate !== "object") return [];
    const source = candidate as Partial<DockVisibilityRule>;
    const fallbackId = `${prefix}-${index + 1}`;
    const baseId = stringValue(source.id, fallbackId, 80) || fallbackId;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);
    const matchType = enumValue(
      source.matchType,
      Object.keys(CONTEXT_MATCH_TYPES) as Array<DockVisibilityRule["matchType"]>,
      "path",
    );
    return [{
      id,
      enabled: booleanValue(source.enabled, false),
      matchType,
      matchValue: normalizeRuleMatchValue(source.matchValue, matchType),
    }];
  });
}

export function normalizeSettings(value: unknown): LedgeSettings {
  const source = value && typeof value === "object" ? value as SettingsInput : {};
  const usedIds = new Set<string>();
  const inputItems = Array.isArray(source.items) ? source.items.slice(0, 48) : cloneDefaultItems();
  const items = inputItems
    .map((item, index) => normalizeItem(item, index, usedIds))
    .filter((item): item is DockItemSettings => item !== null);

  return {
    enabled: booleanValue(source.enabled, DEFAULT_SETTINGS.enabled),
    position: enumValue<DockPosition>(source.position, DOCK_POSITIONS, DEFAULT_SETTINGS.position),
    autoHide: booleanValue(source.autoHide, DEFAULT_SETTINGS.autoHide),
    showLabels: booleanValue(source.showLabels, DEFAULT_SETTINGS.showLabels),
    itemSize: clamp(source.itemSize, DEFAULT_SETTINGS.itemSize, 30, 84),
    iconSize: clamp(source.iconSize, DEFAULT_SETTINGS.iconSize, 14, 72),
    gap: clamp(source.gap, DEFAULT_SETTINGS.gap, 0, 32),
    padding: clamp(source.padding, DEFAULT_SETTINGS.padding, 0, 32),
    radius: clamp(source.radius, DEFAULT_SETTINGS.radius, 0, 40),
    edgeOffset: clamp(source.edgeOffset, DEFAULT_SETTINGS.edgeOffset, 0, 160),
    showTrigger: booleanValue(source.showTrigger, DEFAULT_SETTINGS.showTrigger),
    triggerSize: clamp(source.triggerSize, DEFAULT_SETTINGS.triggerSize, 4, 64),
    triggerLength: clamp(source.triggerLength, DEFAULT_SETTINGS.triggerLength, 24, 360),
    triggerAreaShowBackground: booleanValue(
      source.triggerAreaShowBackground,
      DEFAULT_SETTINGS.triggerAreaShowBackground,
    ),
    triggerAreaShowBorder: booleanValue(
      source.triggerAreaShowBorder,
      DEFAULT_SETTINGS.triggerAreaShowBorder,
    ),
    triggerAreaSurfaceMode: enumValue<SurfaceMode>(
      source.triggerAreaSurfaceMode,
      SURFACE_MODES,
      DEFAULT_SETTINGS.triggerAreaSurfaceMode,
    ),
    triggerAreaSurfaceOpacity: clamp(
      source.triggerAreaSurfaceOpacity,
      DEFAULT_SETTINGS.triggerAreaSurfaceOpacity,
      0,
      100,
    ),
    triggerAreaSurfaceColor: colorValue(
      source.triggerAreaSurfaceColor,
      DEFAULT_SETTINGS.triggerAreaSurfaceColor,
    ),
    triggerAreaGradientStart: colorValue(
      source.triggerAreaGradientStart,
      DEFAULT_SETTINGS.triggerAreaGradientStart,
    ),
    triggerAreaGradientEnd: colorValue(
      source.triggerAreaGradientEnd,
      DEFAULT_SETTINGS.triggerAreaGradientEnd,
    ),
    triggerAreaGradientAngle: clamp(
      source.triggerAreaGradientAngle,
      DEFAULT_SETTINGS.triggerAreaGradientAngle,
      0,
      360,
    ),
    triggerAreaRadius: clamp(
      source.triggerAreaRadius,
      DEFAULT_SETTINGS.triggerAreaRadius,
      0,
      40,
    ),
    triggerAreaBorderWidth: clamp(
      source.triggerAreaBorderWidth,
      DEFAULT_SETTINGS.triggerAreaBorderWidth,
      0,
      6,
    ),
    triggerAreaBorderColor: colorValue(
      source.triggerAreaBorderColor,
      DEFAULT_SETTINGS.triggerAreaBorderColor,
    ),
    triggerSurfaceThickness: clamp(
      source.triggerSurfaceThickness,
      DEFAULT_SETTINGS.triggerSurfaceThickness,
      1,
      48,
    ),
    triggerShowBackground: booleanValue(
      source.triggerShowBackground ?? source.hotCornerShowBackground,
      DEFAULT_SETTINGS.triggerShowBackground,
    ),
    triggerShowBorder: booleanValue(
      source.triggerShowBorder ?? source.hotCornerShowBorder,
      DEFAULT_SETTINGS.triggerShowBorder,
    ),
    triggerSurfaceMode: enumValue<SurfaceMode>(
      source.triggerSurfaceMode ?? source.hotCornerSurfaceMode,
      SURFACE_MODES,
      DEFAULT_SETTINGS.triggerSurfaceMode,
    ),
    triggerSurfaceOpacity: clamp(
      source.triggerSurfaceOpacity ?? source.hotCornerSurfaceOpacity,
      DEFAULT_SETTINGS.triggerSurfaceOpacity,
      0,
      100,
    ),
    triggerSurfaceColor: colorValue(
      source.triggerSurfaceColor ?? source.hotCornerSurfaceColor,
      DEFAULT_SETTINGS.triggerSurfaceColor,
    ),
    triggerGradientStart: colorValue(
      source.triggerGradientStart ?? source.hotCornerGradientStart,
      DEFAULT_SETTINGS.triggerGradientStart,
    ),
    triggerGradientEnd: colorValue(
      source.triggerGradientEnd ?? source.hotCornerGradientEnd,
      DEFAULT_SETTINGS.triggerGradientEnd,
    ),
    triggerGradientAngle: clamp(
      source.triggerGradientAngle ?? source.hotCornerGradientAngle,
      DEFAULT_SETTINGS.triggerGradientAngle,
      0,
      360,
    ),
    triggerRadius: clamp(
      source.triggerRadius ?? source.hotCornerRadius,
      DEFAULT_SETTINGS.triggerRadius,
      0,
      40,
    ),
    triggerBorderWidth: clamp(
      source.triggerBorderWidth ?? source.hotCornerBorderWidth,
      DEFAULT_SETTINGS.triggerBorderWidth,
      0,
      6,
    ),
    triggerBorderColor: colorValue(
      source.triggerBorderColor ?? source.hotCornerBorderColor,
      DEFAULT_SETTINGS.triggerBorderColor,
    ),
    revealDelay: clamp(source.revealDelay, DEFAULT_SETTINGS.revealDelay, 0, 3000),
    hideDelay: clamp(source.hideDelay, DEFAULT_SETTINGS.hideDelay, 0, 10000),
    motionDuration: clamp(source.motionDuration, DEFAULT_SETTINGS.motionDuration, 0, 1000),
    magnification: booleanValue(source.magnification, DEFAULT_SETTINGS.magnification),
    magnificationScale: clamp(source.magnificationScale, DEFAULT_SETTINGS.magnificationScale, 1, 2),
    neighborScale: clamp(source.neighborScale, DEFAULT_SETTINGS.neighborScale, 1, 1.6),
    showDockBackground: booleanValue(
      source.showDockBackground,
      DEFAULT_SETTINGS.showDockBackground,
    ),
    showDockBorder: booleanValue(source.showDockBorder, DEFAULT_SETTINGS.showDockBorder),
    surfaceMode: enumValue<SurfaceMode>(source.surfaceMode, SURFACE_MODES, DEFAULT_SETTINGS.surfaceMode),
    surfaceOpacity: clamp(source.surfaceOpacity, DEFAULT_SETTINGS.surfaceOpacity, 0, 100),
    surfaceColor: colorValue(source.surfaceColor, DEFAULT_SETTINGS.surfaceColor),
    gradientStart: colorValue(source.gradientStart, DEFAULT_SETTINGS.gradientStart),
    gradientEnd: colorValue(source.gradientEnd, DEFAULT_SETTINGS.gradientEnd),
    gradientAngle: clamp(source.gradientAngle, DEFAULT_SETTINGS.gradientAngle, 0, 360),
    accentColor: colorValue(source.accentColor, DEFAULT_SETTINGS.accentColor),
    borderColor: colorValue(source.borderColor, DEFAULT_SETTINGS.borderColor),
    includeRules: normalizeVisibilityRules(source.includeRules, "include"),
    excludeRules: normalizeVisibilityRules(source.excludeRules, "exclude"),
    items,
  };
}

export function hasLegacyHotCornerSettings(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.keys(value).some((key) => key === "hotCornersEnabled" || key.startsWith("hotCorner"));
}

export function createDockItem(existingItems: DockItemSettings[]): DockItemSettings {
  const usedIds = new Set(existingItems.map((item) => item.id));
  let id = `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  while (usedIds.has(id)) id = `${id}-new`;
  return dockItem(id, "New item", "", "circle");
}

export function createVisibilityRule(
  existingRules: DockVisibilityRule[],
  prefix: "include" | "exclude",
): DockVisibilityRule {
  const usedIds = new Set(existingRules.map((rule) => rule.id));
  let id = `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  while (usedIds.has(id)) id = `${id}-new`;
  return { id, enabled: false, matchType: "path", matchValue: "" };
}

export function cloneDefaultSettings(): LedgeSettings {
  return normalizeSettings(DEFAULT_SETTINGS);
}
