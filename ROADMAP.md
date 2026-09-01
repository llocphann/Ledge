# Ledge roadmap

This roadmap tracks the work after the multi-Dock preset foundation. It is organized by dependency rather than by a promised calendar date.

## Current foundation

- Up to eight named Dock presets, with one preset reserved for each edge or corner position.
- Exclusive placement: a position already owned by one preset cannot be selected by another preset.
- Multiple enabled Docks render simultaneously and resolve their own items, visibility rules, trigger, appearance, and layout settings.
- Add, duplicate, rename, select, enable or disable, and delete preset controls.
- Automatic migration of the previous single-Dock configuration into `Dock 1`.
- Schema-v2 settings backup for all presets, with schema-v1 single-Dock imports still supported.
- Separate appearance controls for each Dock, activation hitbox, and trigger pill.
- Ordered include and exclude rules inside each Dock using note names, exact paths, folders, or tags.
- Context refresh on active-file and metadata changes without polling.
- Per-window rendering, same-leaf navigation, and persistent drag-and-drop ordering.

## Next — Preset management polish

- Add explicit destructive confirmation before deleting a Dock preset.
- Improve duplicate naming and compact preset management when many Docks exist.
- Add optional preset reordering for the settings UI without affecting placement.
- Show validation warnings for missing target files, invalid icons, duplicate names, and empty presets.
- Make it easy to identify which Docks are currently enabled and which positions remain available.

## Context routing extensions

Each Dock already has independent include and exclude rules. Future routing work can build on that foundation without changing the preset schema:

- Optional per-item visibility rules inside a Dock.
- Optional frontmatter-property matching in addition to note, path, folder, and tag matching.
- A manual session override for temporarily showing or hiding a Dock without rewriting its saved rules.
- Better context diagnostics showing why a Dock is visible or hidden for the active root-pane note.

## Reliability and performance

- Consolidate shared workspace, metadata, and vault event subscriptions if profiling shows meaningful overhead with many simultaneous Docks.
- Avoid redundant DOM rebuilds when a preset's resolved configuration has not changed.
- Expand automated coverage for multi-window rendering, deleted presets, renamed folders, disabled presets, and imported malformed configurations.
- Add recovery for a synced configuration that references an invalid selected preset or partially written preset list.
- Keep release data forward-compatible so newer settings do not corrupt older installed versions.

## Later candidates

- Theme-aware light and dark variants within one preset.
- A small command palette for selecting, enabling, disabling, or previewing Docks.
- Community-shareable preset files after the multi-Dock schema has proven stable.
- Optional preset templates for common navigation layouts.

These later candidates are exploratory. Deterministic placement, migration safety, and reliable multi-window behavior take priority over adding more match types or visual options.
