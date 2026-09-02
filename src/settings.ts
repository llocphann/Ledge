import {
  DOCK_POSITIONS,
  CONTEXT_MATCH_TYPES,
  ICON_RENDER_MODES,
  ICON_SOURCES,
  SURFACE_MODES,
  type DockItemSettings,
  type DockPresetSettings,
  type DockSettings,
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

type DockSettingsInput = Partial<DockSettings> & LegacyHotCornerSettings;
type SettingsInput = Partial<LedgeSettings> & LegacyHotCornerSettings;

export const MAX_DOCK_PRESETS = DOCK_POSITIONS.length;

const DEFAULT_ITEMS: DockItemSettings[] = [];

const DEFAULT_DOCK: DockSettings = {
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

const DEFAULT_PRESET: DockPresetSettings = {
  id: "dock-1",
  name: "Dock 1",
  ...DEFAULT_DOCK,
};

export const DEFAULT_SETTINGS: LedgeSettings = {
  ...DEFAULT_DOCK,
  selectedDockId: DEFAULT_PRESET.id,
  docks: [DEFAULT_PRESET],
};

function dockItem(id: string, label: string, target: string, icon: string): DockItemSettings {
  return {
    id,
    enabled: true,
    label,
    target,
    iconSource: "lucide",
    icon,
    builtInIcon: icon,
    vaultIconPath: "",
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

function looksLikeVaultIconPath(value: string): boolean {
  return /\.(?:png|jpe?g|webp|gif|svg)$/i.test(value);
}

function cloneItems(items: DockItemSettings[]): DockItemSettings[] {
  return items.map((item) => ({ ...item }));
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

  const iconSource = enumValue<IconSource>(source.iconSource, ICON_SOURCES, "lucide");
  const legacyIcon = stringValue(source.icon, iconSource === "lucide" ? "circle" : "", 500);
  const legacyVaultPathInBuiltInSource = iconSource === "lucide"
    && source.builtInIcon === undefined
    && source.vaultIconPath === undefined
    && looksLikeVaultIconPath(legacyIcon);
  const builtInIcon = stringValue(
    source.builtInIcon,
    iconSource === "lucide" && !legacyVaultPathInBuiltInSource ? legacyIcon : "circle",
    500,
  );
  const vaultIconPath = stringValue(
    source.vaultIconPath,
    iconSource === "vault" || legacyVaultPathInBuiltInSource ? legacyIcon : "",
    500,
  );

  return {
    id,
    enabled: booleanValue(source.enabled, true),
    label: stringValue(source.label, `Item ${index + 1}`, 120),
    target: stringValue(source.target, "", 500),
    iconSource,
    icon: iconSource === "vault" ? vaultIconPath : builtInIcon,
    builtInIcon,
    vaultIconPath,
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

function normalizeDockSettings(value: unknown, fallback: DockSettings = DEFAULT_DOCK): DockSettings {
  const source = value && typeof value === "object" ? value as DockSettingsInput : {};
  const usedIds = new Set<string>();
  const fallbackItems = cloneItems(fallback.items);
  const inputItems = Array.isArray(source.items) ? source.items.slice(0, 48) : fallbackItems;
  const items = inputItems
    .map((item, index) => normalizeItem(item, index, usedIds))
    .filter((item): item is DockItemSettings => item !== null);

  return {
    enabled: booleanValue(source.enabled, fallback.enabled),
    position: enumValue<DockPosition>(source.position, DOCK_POSITIONS, fallback.position),
    autoHide: booleanValue(source.autoHide, fallback.autoHide),
    showLabels: booleanValue(source.showLabels, fallback.showLabels),
    itemSize: clamp(source.itemSize, fallback.itemSize, 30, 84),
    iconSize: clamp(source.iconSize, fallback.iconSize, 14, 72),
    gap: clamp(source.gap, fallback.gap, 0, 32),
    padding: clamp(source.padding, fallback.padding, 0, 32),
    radius: clamp(source.radius, fallback.radius, 0, 40),
    edgeOffset: clamp(source.edgeOffset, fallback.edgeOffset, 0, 160),
    showTrigger: booleanValue(source.showTrigger, fallback.showTrigger),
    triggerSize: clamp(source.triggerSize, fallback.triggerSize, 4, 64),
    triggerLength: clamp(source.triggerLength, fallback.triggerLength, 24, 360),
    triggerAreaShowBackground: booleanValue(source.triggerAreaShowBackground, fallback.triggerAreaShowBackground),
    triggerAreaShowBorder: booleanValue(source.triggerAreaShowBorder, fallback.triggerAreaShowBorder),
    triggerAreaSurfaceMode: enumValue<SurfaceMode>(source.triggerAreaSurfaceMode, SURFACE_MODES, fallback.triggerAreaSurfaceMode),
    triggerAreaSurfaceOpacity: clamp(source.triggerAreaSurfaceOpacity, fallback.triggerAreaSurfaceOpacity, 0, 100),
    triggerAreaSurfaceColor: colorValue(source.triggerAreaSurfaceColor, fallback.triggerAreaSurfaceColor),
    triggerAreaGradientStart: colorValue(source.triggerAreaGradientStart, fallback.triggerAreaGradientStart),
    triggerAreaGradientEnd: colorValue(source.triggerAreaGradientEnd, fallback.triggerAreaGradientEnd),
    triggerAreaGradientAngle: clamp(source.triggerAreaGradientAngle, fallback.triggerAreaGradientAngle, 0, 360),
    triggerAreaRadius: clamp(source.triggerAreaRadius, fallback.triggerAreaRadius, 0, 40),
    triggerAreaBorderWidth: clamp(source.triggerAreaBorderWidth, fallback.triggerAreaBorderWidth, 0, 6),
    triggerAreaBorderColor: colorValue(source.triggerAreaBorderColor, fallback.triggerAreaBorderColor),
    triggerSurfaceThickness: clamp(source.triggerSurfaceThickness, fallback.triggerSurfaceThickness, 1, 48),
    triggerShowBackground: booleanValue(source.triggerShowBackground ?? source.hotCornerShowBackground, fallback.triggerShowBackground),
    triggerShowBorder: booleanValue(source.triggerShowBorder ?? source.hotCornerShowBorder, fallback.triggerShowBorder),
    triggerSurfaceMode: enumValue<SurfaceMode>(source.triggerSurfaceMode ?? source.hotCornerSurfaceMode, SURFACE_MODES, fallback.triggerSurfaceMode),
    triggerSurfaceOpacity: clamp(source.triggerSurfaceOpacity ?? source.hotCornerSurfaceOpacity, fallback.triggerSurfaceOpacity, 0, 100),
    triggerSurfaceColor: colorValue(source.triggerSurfaceColor ?? source.hotCornerSurfaceColor, fallback.triggerSurfaceColor),
    triggerGradientStart: colorValue(source.triggerGradientStart ?? source.hotCornerGradientStart, fallback.triggerGradientStart),
    triggerGradientEnd: colorValue(source.triggerGradientEnd ?? source.hotCornerGradientEnd, fallback.triggerGradientEnd),
    triggerGradientAngle: clamp(source.triggerGradientAngle ?? source.hotCornerGradientAngle, fallback.triggerGradientAngle, 0, 360),
    triggerRadius: clamp(source.triggerRadius ?? source.hotCornerRadius, fallback.triggerRadius, 0, 40),
    triggerBorderWidth: clamp(source.triggerBorderWidth ?? source.hotCornerBorderWidth, fallback.triggerBorderWidth, 0, 6),
    triggerBorderColor: colorValue(source.triggerBorderColor ?? source.hotCornerBorderColor, fallback.triggerBorderColor),
    revealDelay: clamp(source.revealDelay, fallback.revealDelay, 0, 3000),
    hideDelay: clamp(source.hideDelay, fallback.hideDelay, 0, 10000),
    motionDuration: clamp(source.motionDuration, fallback.motionDuration, 0, 1000),
    magnification: booleanValue(source.magnification, fallback.magnification),
    magnificationScale: clamp(source.magnificationScale, fallback.magnificationScale, 1, 2),
    neighborScale: clamp(source.neighborScale, fallback.neighborScale, 1, 1.6),
    showDockBackground: booleanValue(source.showDockBackground, fallback.showDockBackground),
    showDockBorder: booleanValue(source.showDockBorder, fallback.showDockBorder),
    surfaceMode: enumValue<SurfaceMode>(source.surfaceMode, SURFACE_MODES, fallback.surfaceMode),
    surfaceOpacity: clamp(source.surfaceOpacity, fallback.surfaceOpacity, 0, 100),
    surfaceColor: colorValue(source.surfaceColor, fallback.surfaceColor),
    gradientStart: colorValue(source.gradientStart, fallback.gradientStart),
    gradientEnd: colorValue(source.gradientEnd, fallback.gradientEnd),
    gradientAngle: clamp(source.gradientAngle, fallback.gradientAngle, 0, 360),
    accentColor: colorValue(source.accentColor, fallback.accentColor),
    borderColor: colorValue(source.borderColor, fallback.borderColor),
    includeRules: Array.isArray(source.includeRules)
      ? normalizeVisibilityRules(source.includeRules, "include")
      : fallback.includeRules.map((rule) => ({ ...rule })),
    excludeRules: Array.isArray(source.excludeRules)
      ? normalizeVisibilityRules(source.excludeRules, "exclude")
      : fallback.excludeRules.map((rule) => ({ ...rule })),
    items,
  };
}

function uniquePresetId(raw: unknown, index: number, usedIds: Set<string>): string {
  const fallback = `dock-${index + 1}`;
  const base = stringValue(raw, fallback, 80) || fallback;
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);
  return id;
}

function nextFreePosition(used: Set<DockPosition>): DockPosition | null {
  return DOCK_POSITIONS.find((position) => !used.has(position)) ?? null;
}

function normalizePresets(source: SettingsInput): DockPresetSettings[] {
  const raw = Array.isArray(source.docks) ? source.docks.slice(0, MAX_DOCK_PRESETS) : [];
  if (raw.length === 0) {
    return [{
      id: DEFAULT_PRESET.id,
      name: DEFAULT_PRESET.name,
      ...normalizeDockSettings(source, DEFAULT_DOCK),
    }];
  }

  const usedIds = new Set<string>();
  const usedPositions = new Set<DockPosition>();
  return raw.flatMap((candidate, index) => {
    if (!candidate || typeof candidate !== "object") return [];
    const record = candidate as Partial<DockPresetSettings>;
    const dock = normalizeDockSettings(record, DEFAULT_DOCK);
    if (usedPositions.has(dock.position)) {
      const replacement = nextFreePosition(usedPositions);
      if (!replacement) return [];
      dock.position = replacement;
    }
    usedPositions.add(dock.position);
    return [{
      id: uniquePresetId(record.id, index, usedIds),
      name: stringValue(record.name, `Dock ${index + 1}`, 80) || `Dock ${index + 1}`,
      ...dock,
    }];
  });
}

export function normalizeSettings(value: unknown): LedgeSettings {
  const source = value && typeof value === "object" ? value as SettingsInput : {};
  let docks = normalizePresets(source);
  if (docks.length === 0) docks = [{ ...DEFAULT_PRESET, ...normalizeDockSettings(DEFAULT_DOCK) }];

  const requestedSelectedId = stringValue(source.selectedDockId, docks[0]!.id, 80);
  const selected = docks.find((dock) => dock.id === requestedSelectedId) ?? docks[0]!;
  const mirror = normalizeDockSettings(selected, DEFAULT_DOCK);

  return {
    ...mirror,
    selectedDockId: selected.id,
    docks,
  };
}

export function syncSelectedDockPreset(settings: LedgeSettings): void {
  const preset = settings.docks.find((dock) => dock.id === settings.selectedDockId);
  if (!preset) return;
  Object.assign(preset, normalizeDockSettings(settings, preset));
}

export function applyDockPreset(settings: LedgeSettings, dockId: string): boolean {
  const preset = settings.docks.find((dock) => dock.id === dockId);
  if (!preset) return false;
  settings.selectedDockId = preset.id;
  Object.assign(settings, normalizeDockSettings(preset, preset));
  return true;
}

export function getDockPreset(settings: LedgeSettings, dockId: string): DockPresetSettings | null {
  return settings.docks.find((dock) => dock.id === dockId) ?? null;
}

export function availableDockPositions(
  settings: LedgeSettings,
  dockId = settings.selectedDockId,
): DockPosition[] {
  const occupied = new Set(
    settings.docks
      .filter((dock) => dock.id !== dockId)
      .map((dock) => dock.position),
  );
  return DOCK_POSITIONS.filter((position) => !occupied.has(position));
}

function nextDockId(settings: LedgeSettings): string {
  const used = new Set(settings.docks.map((dock) => dock.id));
  const base = `dock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  let id = base;
  while (used.has(id)) id = `${id}-new`;
  return id;
}

function nextDockName(settings: LedgeSettings, base = "Dock"): string {
  const used = new Set(settings.docks.map((dock) => dock.name.toLocaleLowerCase()));
  let index = settings.docks.length + 1;
  let name = `${base} ${index}`;
  while (used.has(name.toLocaleLowerCase())) {
    index += 1;
    name = `${base} ${index}`;
  }
  return name;
}

export function addDockPreset(settings: LedgeSettings, duplicateSelected = false): DockPresetSettings | null {
  syncSelectedDockPreset(settings);
  if (settings.docks.length >= MAX_DOCK_PRESETS) return null;
  const position = availableDockPositions(settings, "")[0];
  if (!position) return null;

  const selected = getDockPreset(settings, settings.selectedDockId);
  const base = duplicateSelected && selected ? selected : DEFAULT_DOCK;
  const dock = normalizeDockSettings(base, DEFAULT_DOCK);
  dock.position = position;
  const preset: DockPresetSettings = {
    id: nextDockId(settings),
    name: duplicateSelected && selected
      ? nextDockName(settings, `${selected.name} copy`)
      : nextDockName(settings),
    ...dock,
  };
  settings.docks.push(preset);
  applyDockPreset(settings, preset.id);
  return preset;
}

export function removeSelectedDockPreset(settings: LedgeSettings): boolean {
  if (settings.docks.length <= 1) return false;
  syncSelectedDockPreset(settings);
  const index = settings.docks.findIndex((dock) => dock.id === settings.selectedDockId);
  if (index < 0) return false;
  settings.docks.splice(index, 1);
  const next = settings.docks[Math.min(index, settings.docks.length - 1)] ?? settings.docks[0];
  return next ? applyDockPreset(settings, next.id) : false;
}

export function renameSelectedDockPreset(settings: LedgeSettings, name: string): void {
  const preset = getDockPreset(settings, settings.selectedDockId);
  if (!preset) return;
  const normalized = stringValue(name, preset.name, 80);
  if (normalized) preset.name = normalized;
}

export function hasLegacyHotCornerSettings(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.keys(value).some((key) => key === "hotCornersEnabled" || key.startsWith("hotCorner"));
}

export function hasLegacySingleDockSettings(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return !Array.isArray((value as { docks?: unknown }).docks);
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
