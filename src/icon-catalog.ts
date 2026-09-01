export const ICONIFY_COLLECTIONS = [
  { prefix: "tabler", name: "Tabler Icons" },
  { prefix: "mdi", name: "Material Design Icons" },
  { prefix: "ph", name: "Phosphor" },
  { prefix: "bi", name: "Bootstrap Icons" },
] as const;

export type IconifyPrefix = (typeof ICONIFY_COLLECTIONS)[number]["prefix"];

export interface BuiltInIconChoice {
  id: string;
  name: string;
}

const ICONIFY_ID_PREFIX = "iconify:";
const PHOSPHOR_VARIANT_SUFFIXES = ["-bold", "-duotone", "-fill", "-light", "-thin"];

export function iconifyPrefixes(): string {
  return ICONIFY_COLLECTIONS.map((collection) => collection.prefix).join(",");
}

export function makeIconifyId(prefix: IconifyPrefix, name: string): string {
  return `${ICONIFY_ID_PREFIX}${prefix}:${name}`;
}

export function parseIconifyId(iconId: string): { prefix: IconifyPrefix; name: string } | null {
  if (!iconId.startsWith(ICONIFY_ID_PREFIX)) return null;
  const [prefix, ...nameParts] = iconId.slice(ICONIFY_ID_PREFIX.length).split(":");
  const name = nameParts.join(":");
  if (!name || !ICONIFY_COLLECTIONS.some((collection) => collection.prefix === prefix)) return null;
  return { prefix: prefix as IconifyPrefix, name };
}

export function iconDisplayName(iconId: string): string {
  const parsed = parseIconifyId(iconId);
  const raw = parsed ? parsed.name : iconId.replace(/^lucide-/, "");
  return raw
    .split("-")
    .filter(Boolean)
    .map((part) => part.length <= 2
      ? part.toUpperCase()
      : `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function shouldIncludeIconifyName(prefix: IconifyPrefix, name: string): boolean {
  if (prefix !== "ph") return true;
  return !PHOSPHOR_VARIANT_SUFFIXES.some((suffix) => name.endsWith(suffix));
}
