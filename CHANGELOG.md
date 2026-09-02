# Changelog

## Unreleased

- Fix Dock item Settings reorder initialization with a declarative render hook, and replace unreliable HTML5 drag/drop with pointer-captured dragging while retaining visible move-up / move-down buttons.
- Fix external Iconify previews and Dock icons rendering too small by normalizing their SVG bodies to Obsidian's custom-icon coordinate space and migrating the existing icon cache.
- Keep Dock item and visibility-rule titles synchronized after committed label/path/value edits without saving every keystroke.
- Replace the remaining eager vault file controls with bounded suggesters for visibility paths and vault-image icons; Target path search can now discover other file types when a query is entered.

- Reduce settings work after item reordering by avoiding a full settings rebuild after native drag operations.
- Prefilter Target path candidates once when its suggester opens, keeping subsequent searches bounded to relevant Markdown, Base, and Canvas files.
- Avoid external icon-cache synchronization for unrelated settings changes while still syncing when icon data or imported settings change.
- Disambiguate duplicate Dock item page names in settings without changing the actual Dock labels.

## 2.0.1

- Fix a freeze when opening or editing a Dock item's Target path in large vaults by replacing the eager vault-wide file control with a bounded lazy suggester.
- Limit Target path suggestions to 50 relevant Markdown, Base, and Canvas files while excluding `.git` and `node_modules` paths.

## 2.0.0

- Add up to eight named Dock presets that can render simultaneously, with add, duplicate, rename, select, enable/disable, and delete controls.
- Simplify settings into one continuous Dock-first page: Dock configuration comes first, Data follows below the Dock sections, and About remains the final footer instead of using separate Docks/Data/About destinations.
- Replace Dock preset cards with one compact preset-button row followed by a trailing `+` button; keep rename, duplicate, and delete actions in the selected-preset management row instead of cluttering the preset switcher.
- Move Items, Layout, Behavior, Visibility, Trigger, and Appearance into a separate full-width section bar below the preset controls, with spacing and a divider so preset selection and Dock-section selection are visually distinct.
- Keep About as a shared footer showing the current plugin version and author from the manifest alongside restore-defaults and support actions.
- Reuse the existing declarative Dock section definitions instead of manually duplicating Layout controls, preventing stale custom-render bodies from producing repeated settings.
- Anchor straight Top and Bottom Docks, including their auto-hide triggers, to the active view content area instead of the entire root workspace; Top Left and Top Right corner triggers now use the same active-note anchor so they stay inside the note area.
- Make Dock positions exclusive across presets: once one Dock uses left, right, top, bottom, or a corner position, that position is removed from every other Dock's Position dropdown; imported duplicate positions are repaired deterministically.
- Migrate the existing single-Dock configuration into `Dock 1` automatically without losing its layout, items, visibility rules, trigger, or appearance settings.
- Upgrade settings export schema to v2 for multi-Dock backups while keeping schema-v1 imports compatible.
- Expand the Dock built-in icon picker into a compact grid that shows only icon and name while searching Obsidian/Lucide, Tabler Icons, Material Design Icons, Phosphor, and Bootstrap Icons through one Built-in icon source.
- Load the additional open-source icon collections from Iconify on demand instead of bundling thousands of SVG files into `main.js`.
- Persist external built-in icon choices retained by Dock items in Ledge plugin data and restore them before Dock startup, so they continue to render offline after reloads and after switching away from and back to Icon in vault.
- Switch the Dock item icon control with its source: Built-in icon shows the icon picker, Icon in vault shows the file path and image-rendering controls, and each source preserves its previous value when switching back and forth.
- Keep remembered Icon in vault paths synchronized when their files or parent folders are renamed, even while the item is temporarily using a built-in icon.
- Render all four corner triggers as two rounded pill arms meeting at 90 degrees instead of a square corner block.
- Apply Auto-hide immediately when switching it from Off to On, while clearing stale reveal/hide timers across mode changes.
- Use Node.js 22 across development, CI, and release tooling.

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
