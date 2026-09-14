# Ledge

Ledge adds customizable navigation docks to the edges and corners of your Obsidian workspace, keeping frequently used notes, Bases, canvases, and other vault files within reach.

> [!IMPORTANT]
> This is the **development branch** for Ledge 2.3.0. It may contain incomplete architectural work and is not the recommended branch for normal use. Development is promoted through `dev` → `prerelease` → `stable`.

<p align="center">
  <img src="assets/homepage.png" alt="Ledge Dock in an Obsidian theme" width="82%">
</p>

<p align="center">
  <sub>Dock in my theme</sub>
</p>

<p align="center">
  <img src="assets/dock.png" alt="Ledge Dock" width="58%">
</p>

## Highlights

- Create up to **8 independent Docks** and use them at the same time.
- Place Docks on the **left, right, top, bottom, or any corner**.
- Add shortcuts to notes, Bases, canvases, and other vault files.
- Use built-in icons from **Obsidian/Lucide, Tabler, Material Design Icons, Phosphor, and Bootstrap Icons**, or use images stored in your vault.
- Configure **auto-hide**, reveal/hide timing, trigger areas, labels, motion, and macOS-style magnification.
- Show or hide each Dock by **note name, exact path, folder, or tag**.
- Customize Dock surfaces, borders, colors, gradients, item icons, and tile appearance.
- Reorder items with drag-and-drop or keyboard controls.
- Navigate in the current leaf without creating unnecessary tabs.
- Works with pop-out windows.
- Export and import your complete Ledge configuration as JSON.

## Install

### Community Plugins

Open **Settings → Community plugins → Browse**, search for **Ledge**, then install and enable it.

### Manual installation

Download `main.js`, `manifest.json`, and `styles.css` from the latest release and place them in:

```text
<Vault>/.obsidian/plugins/ledge/
```

Reload Obsidian and enable **Ledge** under **Community plugins**.

> Ledge is desktop-only and requires Obsidian 1.13.7 or newer.

## Documentation

See the [Ledge Wiki](https://github.com/llocphann/Ledge/wiki) for detailed guides to Dock presets, items and icons, visibility rules, auto-hide and triggers, appearance, backup/restore, and troubleshooting.

---

# Ledge 2.3.0 Development Roadmap

Ledge 2.3.0 is an **architecture, performance, and hardening release**. The goal is not broad feature expansion; it is to make the existing multi-Dock architecture scale cleanly across up to eight Docks, large workspaces, multiple windows, and frequent settings changes.

## Branch promotion workflow

```text
dev
 ↓
prerelease
 smoke test + manual test + regression hardening
 ↓
stable
 most stable / release-ready only
```

### `dev`

The active engineering branch for 2.3.0. Architectural refactors, runtime and persistence changes, schema/internal API changes, behavioral tests, instrumentation, and performance work happen here. `dev` should remain buildable as often as practical, but individual commits are not required to be release-ready.

### `prerelease`

The release-candidate branch. Once feature work is complete on `dev`, promote it here for smoke testing, manual testing in real Obsidian workspaces, multi-window verification, large-vault testing, regression fixes, migration verification, and performance verification. No new feature work should begin here unless required to resolve a release blocker.

### `stable`

The most stable branch. Promote from `prerelease` only after all release gates pass. `stable` is not used for ongoing feature development or opportunistic refactoring.

---

## Phase 0 — CI and release baseline

Establish a deterministic baseline before runtime refactoring.

- Restore a fully green `npm run check`.
- Fix stale or overly implementation-specific assertions that create false CI failures.
- Keep version metadata synchronized across `manifest.json`, `package.json`, `package-lock.json`, and `versions.json` where applicable.
- Ensure release workflows validate, build, test, attest, tag, and publish without mutating repository source files.
- Do not let release automation rewrite and commit source or lockfiles during publishing.

**Completion gate:** CI is green; a given source commit deterministically produces its release artifacts; release automation performs no source-tree mutation.

---

## Phase 1 — Shared Runtime Coordinator

Replace per-Dock duplication of global Obsidian event subscriptions with one shared runtime coordinator.

```text
LedgePlugin
└── RuntimeCoordinator
    ├── WorkspaceObserver
    ├── VaultObserver
    ├── DocumentRegistry
    ├── ContextResolver
    └── DockRuntime[]
```

The coordinator owns global subscriptions for workspace layout changes, active-leaf changes, file-open events, metadata changes, window open/close events, and vault create/modify/delete/rename events. It dispatches only relevant invalidation/update work to affected Dock runtimes.

**Requirements:** one top-level subscription per global event source; disabled Docks do not require a full DOM/runtime controller merely to maintain persisted data; multi-window behavior remains intact; no polling or global `MutationObserver` replacement.

**Completion gate:** with eight configured Docks, global Obsidian event subscriptions do not multiply by eight.

---

## Phase 2 — Centralized Vault Path Maintenance

Move persisted path maintenance out of individual Dock runtimes into a shared `PathMaintenanceService`.

```text
vault rename
↓
PathMaintenanceService
↓
update all affected Dock data
↓
persist once
↓
invalidate affected runtimes only
```

Maintain item targets, vault icon paths, remembered vault icon paths, include rules using paths/folders, and exclude rules using paths/folders.

**Completion gate:** one vault rename produces one maintenance transaction and at most one persistence write, including for disabled Docks.

---

## Phase 3 — Document and Context Runtime Cache

Resolve workspace/document state once per refresh cycle and reuse it across Dock operations.

```ts
interface DocumentRuntimeContext {
    document: Document;
    leaf: WorkspaceLeaf | null;
    contentEl: HTMLElement | null;
    file: TFile | null;
    noteContext: NoteContext | null;
}
```

Reuse this for visibility evaluation, geometry, workspace host resolution, active-target state, trigger positioning, and metadata context. Avoid repeated workspace leaf scans in one refresh cycle and invalidate on layout/active-leaf/document/window changes.

---

## Phase 4 — Incremental Dock Rendering

Replace broad full-Dock rebuilds with change-aware rendering using dirty domains:

```text
STYLE
GEOMETRY
VISIBILITY
ITEMS
ICONS
POSITION
```

Style-only changes must not recreate item buttons; a change to one Dock must not rebuild unrelated Docks; item DOM should be reconciled by stable item IDs; accessibility and interaction state must survive incremental updates.

**Completion gate:** runtime work scales primarily with affected state rather than total configured Docks.

---

## Phase 5 — Target Resolution Index

Maintain per-Dock target state keyed by stable item ID so routine geometry/active-state refreshes do not repeatedly resolve every target.

Invalidate when a configured target changes, relevant files are created/deleted, a rename affects a target, or link resolution changes.

**Completion gate:** routine geometry refreshes do not re-run link resolution for every Dock item.

---

## Phase 6 — Settings Persistence Coordinator

Introduce a `SettingsStore` responsible for serializing writes, coalescing frequent changes, normalization, explicit flushes, and persistence error handling.

Persist structural/destructive operations immediately. Coalesce continuous appearance controls such as sliders, numeric controls, and colors with an initial debounce window around **150–250 ms**.

**Requirements:** UI/runtime state updates immediately; `saveData()` calls do not race; latest valid state always wins.

---

## Phase 7 — Canonical Multi-Dock State Model

Remove the duplicated selected-Dock mirror from persisted settings.

```ts
interface LedgeSettings {
    selectedDockId: string;
    docks: DockPresetSettings[];
}
```

`docks[]` becomes the single source of truth. UI code accesses the selected preset through an accessor instead of copying it into top-level Dock fields. Remove mirror synchronization and unsafe preset-to-root settings casts.

If persisted shape changes, introduce **schema v3** with deterministic, idempotent migration while continuing to import supported older schemas.

**Completion gate:** one authoritative representation exists for each Dock's settings.

---

## Phase 8 — Iconify Pipeline Optimization

Add approximately **200–300 ms** search debounce, stale-query rejection, in-flight request deduplication, a smaller initial remote result set, lazy SVG body fetching for visible/top results, and bounded runtime caching where appropriate. Preserve persisted-cache sanitation and offline rendering.

**Completion gate:** rapid typing does not trigger a full Iconify request/fetch sequence for every keystroke.

---

## Phase 9 — Behavioral Test Upgrade

Shift core regression coverage away from brittle source-shape assertions and toward observable behavior.

Keep pure unit tests for normalization, migration, context matching, layout calculations, icon sanitation, and import/export. Add behavioral coverage for one through eight Docks, disabled/deleted presets, multi-window lifecycle, rename propagation, layout/active-leaf changes, incremental updates, persistence coalescing, Iconify stale searches, and unload during async work.

Instrument global event callbacks, workspace leaf scans, Dock renders, item DOM recreations, target resolutions, and persistence writes.

Representative stress configuration:

```text
8 Docks
48 items per Dock
3 documents/windows
large workspace leaf count
```

---

## Phase 10 — Structural Refactor

Split large modules after the new runtime boundaries are established. Suggested direction:

```text
src/
├── runtime/
│   ├── runtime-coordinator.ts
│   ├── document-registry.ts
│   ├── dock-runtime.ts
│   ├── dock-renderer.ts
│   └── geometry.ts
├── services/
│   ├── path-maintenance.ts
│   ├── target-resolver.ts
│   ├── settings-store.ts
│   └── iconify-provider.ts
├── settings/
│   ├── schema.ts
│   ├── migrations.ts
│   └── ...
└── main.ts
```

Module boundaries follow responsibility, not arbitrary line counts.

---

## Phase 11 — `prerelease` hardening

After feature freeze on `dev`, promote to `prerelease` and stop architectural expansion.

Required smoke/manual coverage includes plugin lifecycle, 1/8-Dock lifecycle, single/split panes, sidebar changes, tab switching, pop-out windows, navigation to Markdown/Bases/Canvas/other supported files, missing/renamed/deleted/recreated targets, visibility routing, auto-hide/triggers, all eight positions, drag/keyboard reorder, magnification, theme switching, settings edits, local/external/vault icons, offline reload, and renamed vault icon files.

No new feature is added on `prerelease` unless required to fix a release blocker.

---

## Phase 12 — Performance certification

Profile at minimum:

```text
1 Dock
4 Docks
8 Docks
```

Verify there is no significant UI jank, repeated workspace-scanning explosion, unnecessary full-Dock rebuild behavior, persistence-write storm, Iconify request burst, detached DOM/observer leak after reload, stale Dock runtime after preset deletion, or window-specific leak after closing pop-outs.

---

## Phase 13 — Stable promotion gate

Promote `prerelease` to `stable` only when all release gates pass:

```text
CI                     PASS
Build                  PASS
Lint                   PASS
Unit tests             PASS
Behavioral tests       PASS
Migration tests        PASS
Smoke tests            PASS
Manual tests           PASS
Multi-window           PASS
8-Dock stress test     PASS
Offline icon test      PASS
Reload/unload test     PASS
Release dry run        PASS
```

After promotion to `stable`: no new feature work, no opportunistic refactor, no architecture changes, and only release-blocking fixes before tagging if required. `main.js`, `manifest.json`, and `styles.css` must be built and verified from the exact stable commit that is tagged.

---

## Ledge 2.3.0 Definition of Done

Ledge 2.3.0 is complete when:

1. Multi-Dock no longer duplicates full workspace/vault event infrastructure per Dock.
2. Disabled Docks do not need full runtime just to maintain persisted paths.
3. Appearance-only changes do not rebuild the whole Dock.
4. Unrelated Docks do not rerender when one Dock changes.
5. Leaf/context state is resolved and reused per refresh cycle.
6. Target resolution is cached and deliberately invalidated.
7. Persistence writes are serialized and coalesced.
8. Canonical settings no longer duplicate selected-Dock state if schema v3 ships.
9. Iconify search is debounced, deduplicated, and bounded.
10. Core regression coverage emphasizes behavior over source regex.
11. Reload/unload leaves no observers, timers, DOM, or event handlers behind.
12. CI and release pipelines are green before stable release.

## Out of scope for 2.3.0

Unless required for the architecture work, 2.3.0 does not add per-item visibility rules, frontmatter routing, new Dock positions, preset marketplace/sharing, preset templates, additional icon libraries, major visual redesign, mobile support, or unrelated feature expansion.

---

<div align="center">

## ☕ Support Ledge

If Ledge has made navigating your Obsidian workspace faster or more comfortable, you can support its continued development here.

<a href="https://www.buymeacoffee.com/llocphann">
  <img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=%E2%98%95&slug=llocphann&button_colour=6f5bd3&font_colour=ffffff&font_family=Inter&outline_colour=000000&coffee_colour=FFDD00" alt="Buy Me a Coffee" height="48">
</a>

<sub>Your support helps me keep refining Ledge, improving dock behavior, customization, visibility rules, and documentation.</sub>

</div>

---

## License

Ledge is licensed under the GNU General Public License v3.0 only.
