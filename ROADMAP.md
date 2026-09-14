# Ledge roadmap

This roadmap tracks work after the multi-Dock foundation. It is organized by dependency rather than by a promised calendar date.

## Current foundation

- Up to eight named Dock presets, with one preset reserved for each edge or corner position.
- Exclusive placement: a position already owned by one preset cannot be selected by another preset.
- Multiple enabled Docks render simultaneously and resolve their own items, visibility rules, trigger, appearance, and layout settings.
- Add, duplicate, rename, select, enable or disable, and delete preset controls.
- Automatic migration of the previous single-Dock configuration into `Dock 1`.
- Canonical schema-v3 plugin data and backups, with raw legacy, schema-v1, and schema-v2 imports still supported.
- Separate appearance controls for each Dock, activation hitbox, and trigger pill.
- Ordered include and exclude rules inside each Dock using note names, exact paths, folders, or tags.
- Shared event-driven runtime coordination for workspace, metadata, window, and vault changes without polling.
- Shared per-document leaf/content/note context resolution across simultaneous Docks.
- Incremental Dock rendering split into style, geometry, visibility, item, icon, and position dirty domains.
- Central path maintenance for renamed targets, visibility rules, and vault icons, including disabled Dock presets.
- Cached target resolution with relevant vault/metadata invalidation.
- Serialized and coalesced settings persistence, plus bounded/debounced external-icon search.
- Per-window rendering, same-leaf navigation, and persistent drag-and-drop ordering.
- CI architecture gates covering global event ownership, shared workspace traversal, disabled-Dock lifecycle, and incremental DOM reconstruction.

## Next — Preset management polish

- Add explicit destructive confirmation before deleting a Dock preset.
- Improve duplicate naming and compact preset management when many Docks exist.
- Add optional preset reordering for the settings UI without affecting placement.
- Show validation warnings for missing target files, invalid icons, duplicate names, and empty presets.
- Make it easy to identify which Docks are currently enabled and which positions remain available.

## Context routing extensions

Each Dock already has independent include and exclude rules. Future routing work can build on that foundation without changing the canonical multi-Dock schema:

- Optional per-item visibility rules inside a Dock.
- Optional frontmatter-property matching in addition to note, path, folder, and tag matching.
- A manual session override for temporarily showing or hiding a Dock without rewriting its saved rules.
- Better context diagnostics showing why a Dock is visible or hidden for the active root-pane note.

## Reliability and performance

The 2.3 runtime hardening removed the largest known scaling costs. Remaining work is focused on measurement, recovery, and edge-case coverage rather than another architecture rewrite:

- Add end-to-end automated multi-window tests once a stable Obsidian runtime harness is practical in CI.
- Add recovery diagnostics for externally synced or manually edited plugin data with partially written preset lists.
- Add optional benchmark instrumentation for large synthetic layouts so future changes can compare render counts, target resolutions, leaf traversals, and persistence writes against a stable baseline.
- Continue replacing implementation-shape tests with behavioral tests where the Obsidian API can be isolated reliably.
- Keep persisted data forward-compatible so future schemas fail safely instead of corrupting older installed versions.

## Later candidates

- Theme-aware light and dark variants within one preset.
- A small command palette for selecting, enabling, disabling, or previewing Docks.
- Community-shareable preset files after the multi-Dock schema has proven stable.
- Optional preset templates for common navigation layouts.

These later candidates are exploratory. Deterministic placement, migration safety, and reliable multi-window behavior take priority over adding more match types or visual options.
