# Ledge

Ledge adds a configurable navigation dock to the edge of your Obsidian workspace. It remains available while you move between notes, Bases, canvases, and Custom Views.

## Features

- Left, right, top, and bottom docks.
- Four 90-degree corner layouts.
- Configurable item size, icon size, gap, padding, radius, and edge offset.
- Theme-aware, solid, and gradient surfaces.
- Independent controls for the shared dock background and outer border.
- Adjustable trigger activation thickness, length, reveal delay, and hide delay.
- Independent appearance controls for the full activation hitbox and the smaller trigger pill.
- Theme-aware, solid, and gradient trigger surfaces with independent visibility, thickness, opacity, radius, background, and border controls.
- A transparent trigger mode that keeps the activation area usable without displaying a visual strip.
- Optional macOS-style focused and neighboring item magnification.
- Built-in Lucide icons or images stored inside the vault.
- Per-item icon size, icon color, and tile gradient overrides.
- Add, disable, remove, and reorder shortcuts.
- Export and import a validated, versioned JSON backup of the complete Dock configuration.
- Pointer drag-and-drop plus `Alt` + arrow keyboard reordering.
- Same-leaf navigation that does not open an extra tab.
- Pop-out window support with automatic lifecycle cleanup.
- Context visibility rules by note name, exact path, folder, or tag, with exclude rules taking priority.
- Tabbed settings for faster navigation between layout, behavior, visibility, trigger, appearance, items, and support.

## Configure Ledge

Open **Settings → Community plugins → Ledge**, then choose a settings tab.

Every dock item has:

- a label;
- a vault-relative target path;
- either a Lucide icon name or a vault-relative image path;
- optional icon size, color, and tile gradient overrides.

For a vault image, choose **Tint** to recolor a transparent icon with the active accent or **Original colors** to preserve the source image.

Under **Trigger**, configure the activation strip attached to the active root pane. Its pointer-sensitive thickness and length are independent from the visible strip, so the visual surface can be hidden without losing access to the dock. Background and border controls support the current theme, a solid color, or a custom gradient.

The rectangle surrounding the trigger pill is the pointer-sensitive activation area. When that outer area is transparent, the current pane or theme background shows through. Ledge provides separate theme, solid, gradient, opacity, radius, and border controls for the activation area and for the pill inside it.

Under **Visibility**, add optional include and exclude rules. With no enabled include rules, the Dock remains available everywhere. Once an include rule is enabled, the Dock appears only in matching contexts. Exclude rules always take priority. Note names, exact vault paths, folders, and tags—including nested tags—are supported.

Use **Data → Export settings** to download a portable JSON backup. Import replaces the current configuration only after Ledge validates the file type and schema, normalizes every value, repairs duplicate IDs, and applies item, rule-count, and file-size limits.

Ledge persists its configuration through Obsidian's plugin data API in the plugin's `data.json`. It does not use browser `localStorage` or `sessionStorage`.

See [ROADMAP.md](ROADMAP.md) for the planned multi-preset Dock system and context-based preset routing.

## Performance and stability

Ledge is event-driven and does not poll the workspace. Geometry refreshes are coalesced into one animation frame, metadata changes refresh visibility only when they affect an active note, and Dock item/visibility collections are bounded during import. Vault image and target paths are rechecked when referenced files change and are updated after vault renames.

Normal navigation has low CPU usage. Magnification and Dock transitions use brief GPU-composited transforms only while interacting with the Dock. Large animated GIF icons, very high item counts, and repeatedly dragging items can add rendering or storage work; static SVG/PNG icons and the default item count are the lightest configuration.

## Install manually

1. Create `.obsidian/plugins/ledge/` inside the vault.
2. Copy `main.js`, `manifest.json`, and `styles.css` into that folder.
3. Reload Obsidian.
4. Enable **Ledge** under **Settings → Community plugins**.

## Development

```bash
npm install
npm run check
```

The release files are `main.js`, `manifest.json`, and `styles.css`. GitHub release tags must match the manifest version exactly without a `v` prefix. The release workflow generates user-facing notes and a GitHub artifact attestation for every published asset.

## Support

If Ledge is useful to you, you can support its continued development:

[![Buy me a coffee](https://raw.githubusercontent.com/llocphann/Ledge/main/assets/buy-me-a-coffee.svg)](https://www.buymeacoffee.com/llocphann)

## License

Ledge is licensed under the GNU General Public License v3.0 only.
