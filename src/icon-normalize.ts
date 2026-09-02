export const OBSIDIAN_ICON_VIEWBOX_SIZE = 100;

export interface ExternalIconGeometry {
  body: string;
  width?: number;
  height?: number;
}

export interface ExternalIconDefaults {
  width?: number;
  height?: number;
}

export function iconBodyForObsidian(
  data: ExternalIconGeometry,
  defaults: ExternalIconDefaults,
): string {
  const width = data.width ?? defaults.width ?? 24;
  const height = data.height ?? defaults.height ?? 24;
  if (width <= 0 || height <= 0) return data.body;

  const scale = Math.min(
    OBSIDIAN_ICON_VIEWBOX_SIZE / width,
    OBSIDIAN_ICON_VIEWBOX_SIZE / height,
  );
  const renderedWidth = width * scale;
  const renderedHeight = height * scale;
  const offsetX = (OBSIDIAN_ICON_VIEWBOX_SIZE - renderedWidth) / 2;
  const offsetY = (OBSIDIAN_ICON_VIEWBOX_SIZE - renderedHeight) / 2;
  const cleanScale = Number(scale.toFixed(6));
  const cleanOffsetX = Number(offsetX.toFixed(6));
  const cleanOffsetY = Number(offsetY.toFixed(6));

  if (cleanScale === 1 && cleanOffsetX === 0 && cleanOffsetY === 0) return data.body;
  const scaled = `<g transform="scale(${cleanScale})">${data.body}</g>`;
  if (cleanOffsetX === 0 && cleanOffsetY === 0) return scaled;
  return `<g transform="translate(${cleanOffsetX} ${cleanOffsetY})">${scaled}</g>`;
}
