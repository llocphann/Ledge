import type { DockVisibilityRule } from "./types";

export interface NoteContext {
  path: string;
  name: string;
  basename: string;
  tags: string[];
}

function comparable(value: string): string {
  return value.trim().toLowerCase();
}

function normalizedPath(value: string): string {
  return comparable(
    value.replaceAll("\\", "/").replace(/\/{2,}/g, "/").replace(/^\.\//, "").replace(/\/$/, ""),
  );
}

function normalizedTag(value: string): string {
  return comparable(value).replace(/^#+/, "");
}

export function contextMatches(rule: DockVisibilityRule, context: NoteContext | null): boolean {
  if (!rule.enabled || !rule.matchValue.trim() || !context) return false;
  if (rule.matchType === "note") {
    const target = comparable(rule.matchValue).replace(/\.md$/i, "");
    return comparable(context.basename) === target
      || comparable(context.name).replace(/\.md$/i, "") === target;
  }
  if (rule.matchType === "path") {
    return normalizedPath(context.path) === normalizedPath(rule.matchValue);
  }
  if (rule.matchType === "folder") {
    const folder = normalizedPath(rule.matchValue);
    return Boolean(folder) && normalizedPath(context.path).startsWith(`${folder}/`);
  }
  const targetTag = normalizedTag(rule.matchValue);
  return context.tags.some((tag) => {
    const candidate = normalizedTag(tag);
    return candidate === targetTag || candidate.startsWith(`${targetTag}/`);
  });
}

export function dockVisibleForContext(
  includeRules: DockVisibilityRule[],
  excludeRules: DockVisibilityRule[],
  context: NoteContext | null,
): boolean {
  const includes = includeRules.filter((rule) => rule.enabled && rule.matchValue.trim());
  const included = includes.length === 0 || includes.some((rule) => contextMatches(rule, context));
  const excluded = excludeRules.some((rule) => contextMatches(rule, context));
  return included && !excluded;
}
