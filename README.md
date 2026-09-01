# Ledge

Ledge adds a configurable navigation dock to the edge of your Obsidian workspace. It remains available while you move between notes, Bases, canvases, and Custom Views.

<p align="center">
  <img src="assets/left-dock.png" alt="Ledge left dock" width="49%">
  <img src="assets/bottom-left-dock.png" alt="Ledge bottom-left dock" width="49%">
</p>

## Features

- Left, right, top, and bottom docks.
- Four 90-degree corner layouts.
- Configurable item size, icon size, gap, padding, radius, and edge offset.
- Theme-aware, solid, and gradient surfaces.
- Independent controls for the shared dock background and outer border.
- Adjustable reveal delay, hide delay, trigger size, and motion duration.
- Optional macOS-style focused and neighboring item magnification.
- Unified searchable built-in icon picker with Obsidian/Lucide, Tabler Icons, Material Design Icons, Phosphor, and Bootstrap Icons.
- Per-item icon size, icon color, and tile gradient overrides.
- Add, disable, remove, and reorder shortcuts.
- Pointer drag-and-drop plus `Alt` + arrow keyboard reordering.
- Same-leaf navigation that does not open an extra tab.
- Pop-out window support with automatic lifecycle cleanup.
- Tabbed settings for faster navigation between layout, behavior, appearance, items, and support.

## Configure Ledge

Open **Settings → Community plugins → Ledge**, then choose a settings tab.

Every dock item has:

- a label;
- a vault-relative target path;
- either an icon chosen from the unified built-in icon picker, a manually entered Obsidian icon ID, or a vault-relative image path;
- optional icon size, color, and tile gradient overrides.

Select **Browse icons** to search a grid where each result shows only its icon and readable name. Obsidian/Lucide icons come from the local Obsidian icon registry. Tabler Icons, Material Design Icons, Phosphor, and Bootstrap Icons are queried from Iconify on demand and registered into the current Obsidian session, which keeps the Ledge plugin bundle small instead of shipping thousands of SVG files.

For a vault image, choose **Tint** to recolor a transparent icon with the active accent or **Original colors** to preserve the source image.

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

The release files are `main.js`, `manifest.json`, and `styles.css`. GitHub release tags must match the manifest version exactly without a `v` prefix.

## Support

If Ledge is useful to you, you can support its continued development:

<a href="https://www.buymeacoffee.com/llocphann">
  <img src="https://raw.githubusercontent.com/llocphann/Ledge/main/assets/buy-me-a-coffee.svg" alt="Buy me a coffee" width="217">
</a>

## License

Ledge is licensed under the GNU General Public License v3.0 only.
