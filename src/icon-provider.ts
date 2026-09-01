import { addIcon, requestUrl } from "obsidian";
import {
  ICONIFY_COLLECTIONS,
  iconDisplayName,
  iconifyPrefixes,
  makeIconifyId,
  parseIconifyId,
  shouldIncludeIconifyName,
  type BuiltInIconChoice,
  type IconifyPrefix,
} from "./icon-catalog";
import { parseIconCache, serializeIconCache, type IconCacheData } from "./icon-cache";

interface IconifyIconData {
  body: string;
  width?: number;
  height?: number;
}

interface IconifyIconResponse {
  icons?: Record<string, IconifyIconData>;
  width?: number;
  height?: number;
}

interface IconifySearchResponse {
  icons?: string[];
}

const ICONIFY_API = "https://api.iconify.design";
const OBSIDIAN_ICON_SIZE = 24;
const FETCH_CHUNK_SIZE = 20;
const registeredIconBodies = new Map<string, string>();
const cachedIconBodies = new Map<string, string>();

function isSupportedPrefix(value: string): value is IconifyPrefix {
  return ICONIFY_COLLECTIONS.some((collection) => collection.prefix === value);
}

function iconBody(data: IconifyIconData, defaults: IconifyIconResponse): string {
  const width = data.width ?? defaults.width ?? OBSIDIAN_ICON_SIZE;
  const height = data.height ?? defaults.height ?? OBSIDIAN_ICON_SIZE;
  if (width === OBSIDIAN_ICON_SIZE && height === OBSIDIAN_ICON_SIZE) return data.body;

  const scaleX = OBSIDIAN_ICON_SIZE / width;
  const scaleY = OBSIDIAN_ICON_SIZE / height;
  return `<g transform="scale(${scaleX} ${scaleY})">${data.body}</g>`;
}

function registerIconBody(iconId: string, body: string): void {
  addIcon(iconId, body);
  registeredIconBodies.set(iconId, body);
}

function registerResponse(prefix: IconifyPrefix, response: IconifyIconResponse): void {
  if (!response.icons) return;
  for (const [name, data] of Object.entries(response.icons)) {
    const iconId = makeIconifyId(prefix, name);
    registerIconBody(iconId, iconBody(data, response));
  }
}

async function fetchIconChunk(prefix: IconifyPrefix, names: string[]): Promise<void> {
  if (names.length === 0) return;
  const icons = names.map(encodeURIComponent).join(",");
  const response = await requestUrl(`${ICONIFY_API}/${prefix}.json?icons=${icons}`);
  registerResponse(prefix, response.json as IconifyIconResponse);
}

export function restoreIconifyCache(pluginData: unknown): void {
  cachedIconBodies.clear();
  for (const [iconId, body] of parseIconCache(pluginData)) {
    cachedIconBodies.set(iconId, body);
    registerIconBody(iconId, body);
  }
}

export function exportIconifyCache(): IconCacheData {
  return serializeIconCache(cachedIconBodies);
}

export function cachedIconifyChoices(): BuiltInIconChoice[] {
  return [...cachedIconBodies.keys()]
    .map((id) => ({ id, name: iconDisplayName(id) }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function ensureIconifyIcons(iconIds: string[]): Promise<void> {
  const grouped = new Map<IconifyPrefix, string[]>();

  for (const iconId of [...new Set(iconIds)]) {
    if (registeredIconBodies.has(iconId)) continue;
    const parsed = parseIconifyId(iconId);
    if (!parsed) continue;
    const names = grouped.get(parsed.prefix) ?? [];
    names.push(parsed.name);
    grouped.set(parsed.prefix, names);
  }

  const requests: Promise<void>[] = [];
  for (const [prefix, names] of grouped) {
    for (let index = 0; index < names.length; index += FETCH_CHUNK_SIZE) {
      requests.push(fetchIconChunk(prefix, names.slice(index, index + FETCH_CHUNK_SIZE)));
    }
  }
  await Promise.allSettled(requests);
}

export async function syncIconifyCache(iconIds: string[]): Promise<boolean> {
  const selectedIds = [...new Set(iconIds.filter((iconId) => parseIconifyId(iconId) !== null))];
  await ensureIconifyIcons(selectedIds);

  const nextCache = new Map<string, string>();
  for (const iconId of selectedIds) {
    const body = registeredIconBodies.get(iconId);
    if (body) nextCache.set(iconId, body);
  }

  const changed = nextCache.size !== cachedIconBodies.size
    || [...nextCache].some(([iconId, body]) => cachedIconBodies.get(iconId) !== body);
  if (!changed) return false;

  cachedIconBodies.clear();
  for (const [iconId, body] of nextCache) cachedIconBodies.set(iconId, body);
  return true;
}

export async function searchIconifyIcons(query: string): Promise<BuiltInIconChoice[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const response = await requestUrl(
    `${ICONIFY_API}/search?query=${encodeURIComponent(normalized)}`
      + `&prefixes=${iconifyPrefixes()}&limit=96`,
  );
  const payload = response.json as IconifySearchResponse;
  const choices = (payload.icons ?? []).flatMap((qualifiedName) => {
    const separator = qualifiedName.indexOf(":");
    if (separator <= 0) return [];
    const prefix = qualifiedName.slice(0, separator);
    const name = qualifiedName.slice(separator + 1);
    if (!isSupportedPrefix(prefix) || !name || !shouldIncludeIconifyName(prefix, name)) return [];
    return [{ id: makeIconifyId(prefix, name), name: iconDisplayName(name) }];
  });

  await ensureIconifyIcons(choices.map((choice) => choice.id));
  return choices;
}
