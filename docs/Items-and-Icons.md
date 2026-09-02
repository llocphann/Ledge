# Items and Icons

Each Dock item is a shortcut to a vault file.

## Basic item settings

- **Enabled** — show or hide the item without deleting it.
- **Label** — text shown when labels are enabled and the item is hovered or focused.
- **Target path** — a vault-relative path to a note, Base, canvas, or another file.
- **Icon source** — a built-in icon or an image stored in the vault.

Clicking an item opens its target in the current leaf instead of creating an unnecessary new tab.

## Built-in icon library

Choose **Built-in icon** and use the icon browser to search:

- Obsidian / Lucide
- Tabler Icons
- Material Design Icons
- Phosphor
- Bootstrap Icons

Obsidian/Lucide icons are available locally. External collections are requested through Iconify when needed.

The first search or selection of an external icon requires a network connection. Once an external icon is selected and retained by a Dock item, Ledge caches it in plugin data so that selected icon can be restored after reload and used offline.

## Image in vault

Choose **Image in vault** to use an image file stored inside your vault. Supported formats are PNG, JPEG, WebP, GIF, and SVG.

**Image rendering** has two modes:

- **Tint** — turns a transparent image into a theme/accent-colored silhouette.
- **Original colors** — preserves the source image colors.

Ledge remembers the last built-in icon and the last vault-image path separately. Switching icon source does not discard the previous choice.

If a remembered vault icon or one of its parent folders is renamed inside Obsidian, Ledge updates the saved path.

## Per-item overrides

An item can override the Dock defaults with:

- Icon size
- Icon color
- Tile gradient start/end

Set **Icon size override** to `0` to inherit the Dock's global icon size.

## Reordering

Reorder items by dragging them in settings. Keyboard reordering is also available with **Alt + Arrow** controls.
