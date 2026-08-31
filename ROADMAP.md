# Ledge roadmap

This roadmap describes the planned multi-preset Dock system. It is intentionally organized by dependency rather than by a promised calendar date.

## Current foundation

- One fully configurable Dock with eight edge and corner positions.
- Separate appearance controls for the Dock, activation hitbox, and trigger pill.
- Ordered include and exclude rules using note names, exact paths, folders, or tags.
- Context refresh on active-file and metadata changes without polling.
- Per-window rendering, same-leaf navigation, and persistent drag-and-drop ordering.

## Phase 1 — Preset data model

- Introduce named presets with stable IDs and a schema version.
- Store layout, trigger, appearance, magnification, labels, and Dock items inside each preset.
- Keep visibility and preset-routing rules outside presets so switching a preset cannot disable its own router.
- Provide a protected fallback preset used when no routing rule matches.
- Add create, duplicate, rename, reorder, and delete actions with explicit confirmation for destructive changes.
- Migrate the existing single-Dock configuration into the fallback preset without changing its appearance or item order.

## Phase 2 — Preset editor and preview

- Add a Presets settings tab with compact preset cards and nested editors.
- Allow previewing a preset without saving it as the active default.
- Show which preset and routing rule currently control the active note.
- Validate missing target files, invalid icons, duplicate names, and empty presets before saving.
- Add JSON export and import with schema validation for backup and sharing.

## Phase 3 — Context-based preset routing

- Reuse the current note-name, exact-path, folder, and nested-tag matcher.
- Evaluate enabled routing rules from top to bottom; the first match selects a preset.
- Preserve the existing exclude rules as the final authority for hiding Ledge completely.
- Add a manual session override that can temporarily pin one preset without rewriting rules.
- Resolve each desktop or pop-out window independently from its active root-pane note.

## Phase 4 — Reliability and performance

- Cache normalized rules and preset lookups, invalidating only on settings or metadata changes.
- Avoid timers and DOM rebuilds when the resolved preset has not changed.
- Test fallback behavior, rule precedence, nested tags, renamed folders, deleted presets, pop-out windows, and legacy migration.
- Add recovery for an imported or synced configuration that references a missing preset.
- Keep release data forward-compatible so newer settings do not corrupt older installed versions.

## Later candidates

- Per-item visibility rules inside a preset.
- Optional routing by frontmatter property values.
- Theme-aware light and dark variants within one preset.
- A small command palette for switching and previewing presets.
- Community-shareable preset files after the core schema is stable.

These later candidates are exploratory. The preset schema, migration path, and deterministic routing behavior take priority over adding more match types.
