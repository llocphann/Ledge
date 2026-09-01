export const DOCK_POSITIONS = [
  "left",
  "right",
  "top",
  "bottom",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const;

export type DockPosition = (typeof DOCK_POSITIONS)[number];

export const SURFACE_MODES = ["theme", "solid", "gradient"] as const;
export type SurfaceMode = (typeof SURFACE_MODES)[number];

export const ICON_SOURCES = ["lucide", "vault"] as const;
export type IconSource = (typeof ICON_SOURCES)[number];

export const ICON_RENDER_MODES = ["tint", "original"] as const;
export type IconRenderMode = (typeof ICON_RENDER_MODES)[number];

export const CONTEXT_MATCH_TYPES = {
  note: "Note name",
  path: "Exact path",
  folder: "Folder",
  tag: "Tag",
} as const;

export type ContextMatchType = keyof typeof CONTEXT_MATCH_TYPES;

export interface DockVisibilityRule {
  id: string;
  enabled: boolean;
  matchType: ContextMatchType;
  matchValue: string;
}

export interface DockItemSettings {
  id: string;
  enabled: boolean;
  label: string;
  target: string;
  iconSource: IconSource;
  icon: string;
  builtInIcon: string;
  vaultIconPath: string;
  iconRenderMode: IconRenderMode;
  iconSize: number;
  iconColor: string;
  tileGradientStart: string;
  tileGradientEnd: string;
}

export interface DockSettings {
  enabled: boolean;
  position: DockPosition;
  autoHide: boolean;
  showLabels: boolean;
  itemSize: number;
  iconSize: number;
  gap: number;
  padding: number;
  radius: number;
  edgeOffset: number;
  showTrigger: boolean;
  triggerSize: number;
  triggerLength: number;
  triggerAreaShowBackground: boolean;
  triggerAreaShowBorder: boolean;
  triggerAreaSurfaceMode: SurfaceMode;
  triggerAreaSurfaceOpacity: number;
  triggerAreaSurfaceColor: string;
  triggerAreaGradientStart: string;
  triggerAreaGradientEnd: string;
  triggerAreaGradientAngle: number;
  triggerAreaRadius: number;
  triggerAreaBorderWidth: number;
  triggerAreaBorderColor: string;
  triggerSurfaceThickness: number;
  triggerShowBackground: boolean;
  triggerShowBorder: boolean;
  triggerSurfaceMode: SurfaceMode;
  triggerSurfaceOpacity: number;
  triggerSurfaceColor: string;
  triggerGradientStart: string;
  triggerGradientEnd: string;
  triggerGradientAngle: number;
  triggerRadius: number;
  triggerBorderWidth: number;
  triggerBorderColor: string;
  revealDelay: number;
  hideDelay: number;
  motionDuration: number;
  magnification: boolean;
  magnificationScale: number;
  neighborScale: number;
  showDockBackground: boolean;
  showDockBorder: boolean;
  surfaceMode: SurfaceMode;
  surfaceOpacity: number;
  surfaceColor: string;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number;
  accentColor: string;
  borderColor: string;
  includeRules: DockVisibilityRule[];
  excludeRules: DockVisibilityRule[];
  items: DockItemSettings[];
}

export interface DockPresetSettings extends DockSettings {
  id: string;
  name: string;
}

/**
 * The top-level DockSettings fields mirror the currently selected preset so
 * the existing declarative settings UI can keep editing one preset at a time.
 * `docks` is the canonical list rendered simultaneously in the workspace.
 */
export interface LedgeSettings extends DockSettings {
  selectedDockId: string;
  docks: DockPresetSettings[];
}

export interface CornerSlot {
  column: number;
  row: number;
}

export interface CornerLayout {
  columns: number;
  rows: number;
  horizontalCount: number;
  slots: CornerSlot[];
}
