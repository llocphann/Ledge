import { parseIconifyId } from "./icon-catalog";

export const ICON_CACHE_DATA_KEY = "__iconCache";
export const ICON_CACHE_VERSION = 1;

const MAX_CACHED_ICONS = 256;
const MAX_ICON_BODY_LENGTH = 24_000;

export interface IconCacheData {
  version: typeof ICON_CACHE_VERSION;
  icons: Record<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeIconBody(body: string): boolean {
  if (!body || body.length > MAX_ICON_BODY_LENGTH) return false;
  if (/<(?:script|foreignObject|iframe|object|embed)\b/i.test(body)) return false;
  if (/\son[a-z]+\s*=/i.test(body)) return false;
  return !/(?:href|xlink:href)\s*=\s*["']?\s*(?:https?:|javascript:|data:)/i.test(body);
}

export function parseIconCache(pluginData: unknown): Map<string, string> {
  if (!isRecord(pluginData)) return new Map();
  const rawCache = pluginData[ICON_CACHE_DATA_KEY];
  if (!isRecord(rawCache) || rawCache.version !== ICON_CACHE_VERSION || !isRecord(rawCache.icons)) {
    return new Map();
  }

  const result = new Map<string, string>();
  for (const [iconId, body] of Object.entries(rawCache.icons)) {
    if (result.size >= MAX_CACHED_ICONS) break;
    if (!parseIconifyId(iconId) || typeof body !== "string" || !isSafeIconBody(body)) continue;
    result.set(iconId, body);
  }
  return result;
}

export function serializeIconCache(cache: ReadonlyMap<string, string>): IconCacheData {
  const icons: Record<string, string> = {};
  for (const [iconId, body] of cache) {
    if (Object.keys(icons).length >= MAX_CACHED_ICONS) break;
    if (!parseIconifyId(iconId) || !isSafeIconBody(body)) continue;
    icons[iconId] = body;
  }
  return { version: ICON_CACHE_VERSION, icons };
}
