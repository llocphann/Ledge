# Ledge

Ledge adds a configurable navigation dock to the edge of your Obsidian workspace. It remains available while you move between notes, Bases, canvases, and Custom Views.

## Features

- Left, right, top, and bottom docks.
- Four 90-degree corner layouts.
- Configurable item size, icon size, gap, padding, radius, and edge offset.
- Theme-aware, solid, and gradient surfaces.
- Independent controls for the shared dock background and outer border.
- Adjustable reveal delay, hide delay, trigger size, and motion duration.
- Optional per-corner hot zones that reveal the dock without polling.
- Independent hot-corner activation size, delay, enabled corners, background, border, radius, opacity, and theme/solid/gradient colors.
- Optional macOS-style focused and neighboring item magnification.
- Built-in Lucide icons or images stored inside the vault.
- Per-item icon size, icon color, and tile gradient overrides.
- Add, disable, remove, and reorder shortcuts.
- Pointer drag-and-drop plus `Alt` + arrow keyboard reordering.
- Same-leaf navigation that does not open an extra tab.
- Pop-out window support with automatic lifecycle cleanup.
- Tabbed settings for faster navigation between layout, behavior, hot corners, appearance, items, and support.

## Configure Ledge

Open **Settings → Community plugins → Ledge**, then choose a settings tab.

Every dock item has:

- a label;
- a vault-relative target path;
- either a Lucide icon name or a vault-relative image path;
- optional icon size, color, and tile gradient overrides.

For a vault image, choose **Tint** to recolor a transparent icon with the active accent or **Original colors** to preserve the source image.

Under **Hot corners**, enable any combination of the four root-pane corners. Resting the pointer inside an enabled corner reveals the dock after the configured activation delay. Hot corners work with auto-hide and use only pointer/focus events while idle.

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

[![Buy me a coffee](https://raw.githubusercontent.com/llocphann/Ledge/main/assets/buy-me-a-coffee.svg)](https://www.buymeacoffee.com/llocphann)

## License

Ledge is licensed under the GNU General Public License v3.0 only.
