# Changelog

## Unreleased

## 1.1.1

- Remove the legacy browser-storage Dock-order migration so all persistent settings use Obsidian's plugin data API.
- Generate release notes automatically for every GitHub release.
- Publish GitHub artifact attestations for `main.js`, `manifest.json`, and `styles.css`.

## 1.1.0

- Add a permanently visible destructive button to every Dock item page.
- Add validated, schema-versioned JSON settings import and export in a dedicated Data tab.
- Restrict imported custom colors to safe CSS color values.
- Refresh tag-based visibility only for active-note metadata changes.
- Refresh configured targets and icons when their vault files change, and preserve their paths after renames.
- Document runtime costs and import safety limits.

## 1.0.0

- Add independent background, gradient, opacity, radius, and border controls for the full trigger activation area.
- Add include and exclude visibility rules by note name, exact path, folder, or tag.
- Refresh Dock visibility when the active file or its indexed tags change.
- Document the multi-preset Dock architecture and context-routing roadmap.

- Replace the experimental Hot Corners interface with a dedicated edge-trigger settings tab.
- Add independent activation thickness, activation length, visible thickness, reveal delay, and hide delay controls.
- Add theme, solid, and gradient trigger surfaces with opacity, radius, background, and border controls.
- Allow the trigger surface to be hidden while retaining its transparent activation area.
- Migrate legacy Hot Corners appearance values to the corresponding edge-trigger settings and remove obsolete keys.
- Keep the Buy Me a Coffee settings button on one yellow line and use Community-compatible Markdown in the README.
- Validate the complete Community Plugins release bundle at version 1.0.0.

## 0.1.0

- Add eight edge and corner positions.
- Add 90-degree corner layouts.
- Add configurable sizing, timing, theme, solid, and gradient surfaces.
- Add Lucide and vault-image icons with per-item appearance overrides.
- Add same-leaf navigation, drag-and-drop ordering, and keyboard reordering.
- Add multi-window lifecycle management without polling.
- Add tabbed settings navigation.
- Add independent dock background and outer-border controls.
- Add a Buy Me a Coffee button to settings and the README.
