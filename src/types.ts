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

export interface DockItemSettings {
  id: string;
  enabled: boolean;
  label: string;
  target: string;
  iconSource: IconSource;
  icon: string;
  iconRenderMode: IconRenderMode;
  iconSize: number;
  iconColor: string;
  tileGradientStart: string;
  tileGradientEnd: string;
}

export interface LedgeSettings {
  legacyOrderMigrated: boolean;
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
  triggerSize: number;
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
  items: DockItemSettings[];
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
