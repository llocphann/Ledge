import {
  DOCK_POSITIONS,
  ICON_RENDER_MODES,
  ICON_SOURCES,
  SURFACE_MODES,
  type DockItemSettings,
  type DockPosition,
  type IconRenderMode,
  type IconSource,
  type LedgeSettings,
  type SurfaceMode,
} from "./types";

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
  legacyOrderMigrated: false,
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
  triggerSize: 14,
  revealDelay: 120,
  hideDelay: 650,
  hotCornersEnabled: false,
  hotCornerTopLeftEnabled: true,
  hotCornerTopRightEnabled: false,
  hotCornerBottomLeftEnabled: false,
  hotCornerBottomRightEnabled: false,
  hotCornerActivationSize: 36,
  hotCornerRevealDelay: 120,
  hotCornerShowBackground: true,
  hotCornerShowBorder: true,
  hotCornerSurfaceMode: "theme",
  hotCornerSurfaceOpacity: 72,
  hotCornerSurfaceColor: "#1f2937",
  hotCornerGradientStart: "#334155",
  hotCornerGradientEnd: "#111827",
  hotCornerGradientAngle: 145,
  hotCornerRadius: 28,
  hotCornerBorderWidth: 1,
  hotCornerBorderColor: "",
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
    iconColor: stringValue(source.iconColor, "", 120),
    tileGradientStart: stringValue(source.tileGradientStart, "", 120),
    tileGradientEnd: stringValue(source.tileGradientEnd, "", 120),
  };
}

export function normalizeSettings(value: unknown): LedgeSettings {
  const source = value && typeof value === "object" ? value as Partial<LedgeSettings> : {};
  const usedIds = new Set<string>();
  const inputItems = Array.isArray(source.items) ? source.items.slice(0, 48) : cloneDefaultItems();
  const items = inputItems
    .map((item, index) => normalizeItem(item, index, usedIds))
    .filter((item): item is DockItemSettings => item !== null);

  return {
    legacyOrderMigrated: booleanValue(
      source.legacyOrderMigrated,
      DEFAULT_SETTINGS.legacyOrderMigrated,
    ),
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
    triggerSize: clamp(source.triggerSize, DEFAULT_SETTINGS.triggerSize, 4, 48),
    revealDelay: clamp(source.revealDelay, DEFAULT_SETTINGS.revealDelay, 0, 3000),
    hideDelay: clamp(source.hideDelay, DEFAULT_SETTINGS.hideDelay, 0, 10000),
    hotCornersEnabled: booleanValue(
      source.hotCornersEnabled,
      DEFAULT_SETTINGS.hotCornersEnabled,
    ),
    hotCornerTopLeftEnabled: booleanValue(
      source.hotCornerTopLeftEnabled,
      DEFAULT_SETTINGS.hotCornerTopLeftEnabled,
    ),
    hotCornerTopRightEnabled: booleanValue(
      source.hotCornerTopRightEnabled,
      DEFAULT_SETTINGS.hotCornerTopRightEnabled,
    ),
    hotCornerBottomLeftEnabled: booleanValue(
      source.hotCornerBottomLeftEnabled,
      DEFAULT_SETTINGS.hotCornerBottomLeftEnabled,
    ),
    hotCornerBottomRightEnabled: booleanValue(
      source.hotCornerBottomRightEnabled,
      DEFAULT_SETTINGS.hotCornerBottomRightEnabled,
    ),
    hotCornerActivationSize: clamp(
      source.hotCornerActivationSize,
      DEFAULT_SETTINGS.hotCornerActivationSize,
      8,
      128,
    ),
    hotCornerRevealDelay: clamp(
      source.hotCornerRevealDelay,
      DEFAULT_SETTINGS.hotCornerRevealDelay,
      0,
      3000,
    ),
    hotCornerShowBackground: booleanValue(
      source.hotCornerShowBackground,
      DEFAULT_SETTINGS.hotCornerShowBackground,
    ),
    hotCornerShowBorder: booleanValue(
      source.hotCornerShowBorder,
      DEFAULT_SETTINGS.hotCornerShowBorder,
    ),
    hotCornerSurfaceMode: enumValue<SurfaceMode>(
      source.hotCornerSurfaceMode,
      SURFACE_MODES,
      DEFAULT_SETTINGS.hotCornerSurfaceMode,
    ),
    hotCornerSurfaceOpacity: clamp(
      source.hotCornerSurfaceOpacity,
      DEFAULT_SETTINGS.hotCornerSurfaceOpacity,
      0,
      100,
    ),
    hotCornerSurfaceColor: stringValue(
      source.hotCornerSurfaceColor,
      DEFAULT_SETTINGS.hotCornerSurfaceColor,
      120,
    ),
    hotCornerGradientStart: stringValue(
      source.hotCornerGradientStart,
      DEFAULT_SETTINGS.hotCornerGradientStart,
      120,
    ),
    hotCornerGradientEnd: stringValue(
      source.hotCornerGradientEnd,
      DEFAULT_SETTINGS.hotCornerGradientEnd,
      120,
    ),
    hotCornerGradientAngle: clamp(
      source.hotCornerGradientAngle,
      DEFAULT_SETTINGS.hotCornerGradientAngle,
      0,
      360,
    ),
    hotCornerRadius: clamp(
      source.hotCornerRadius,
      DEFAULT_SETTINGS.hotCornerRadius,
      0,
      128,
    ),
    hotCornerBorderWidth: clamp(
      source.hotCornerBorderWidth,
      DEFAULT_SETTINGS.hotCornerBorderWidth,
      0,
      6,
    ),
    hotCornerBorderColor: stringValue(
      source.hotCornerBorderColor,
      DEFAULT_SETTINGS.hotCornerBorderColor,
      120,
    ),
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
    surfaceColor: stringValue(source.surfaceColor, DEFAULT_SETTINGS.surfaceColor, 120),
    gradientStart: stringValue(source.gradientStart, DEFAULT_SETTINGS.gradientStart, 120),
    gradientEnd: stringValue(source.gradientEnd, DEFAULT_SETTINGS.gradientEnd, 120),
    gradientAngle: clamp(source.gradientAngle, DEFAULT_SETTINGS.gradientAngle, 0, 360),
    accentColor: stringValue(source.accentColor, DEFAULT_SETTINGS.accentColor, 120),
    borderColor: stringValue(source.borderColor, DEFAULT_SETTINGS.borderColor, 120),
    items,
  };
}

export function createDockItem(existingItems: DockItemSettings[]): DockItemSettings {
  const usedIds = new Set(existingItems.map((item) => item.id));
  let id = `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  while (usedIds.has(id)) id = `${id}-new`;
  return dockItem(id, "New item", "", "circle");
}

export function cloneDefaultSettings(): LedgeSettings {
  return normalizeSettings(DEFAULT_SETTINGS);
}
