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
const FETCH_CHUNK_SIZE = 20;
const registeredIconIds = new Set<string>();

function isSupportedPrefix(value: string): value is IconifyPrefix {
  return ICONIFY_COLLECTIONS.some((collection) => collection.prefix === value);
}

function iconSvg(data: IconifyIconData, defaults: IconifyIconResponse): string {
  const width = data.width ?? defaults.width ?? 24;
  const height = data.height ?? defaults.height ?? 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" aria-hidden="true">${data.body}</svg>`;
}

function registerResponse(prefix: IconifyPrefix, response: IconifyIconResponse): void {
  if (!response.icons) return;
  for (const [name, data] of Object.entries(response.icons)) {
    const iconId = makeIconifyId(prefix, name);
    addIcon(iconId, iconSvg(data, response));
    registeredIconIds.add(iconId);
  }
}

async function fetchIconChunk(prefix: IconifyPrefix, names: string[]): Promise<void> {
  if (names.length === 0) return;
  const icons = names.map(encodeURIComponent).join(",");
  const response = await requestUrl(`${ICONIFY_API}/${prefix}.json?icons=${icons}`);
  registerResponse(prefix, response.json as IconifyIconResponse);
}

export async function ensureIconifyIcons(iconIds: string[]): Promise<void> {
  const grouped = new Map<IconifyPrefix, string[]>();

  for (const iconId of [...new Set(iconIds)]) {
    if (registeredIconIds.has(iconId)) continue;
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
