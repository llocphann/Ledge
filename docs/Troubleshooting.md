# Troubleshooting

## A Dock does not appear

Check these in order:

1. Select the correct Dock preset in settings.
2. Open **Layout** and confirm **Enable dock** is on.
3. Open **Visibility** and check whether an include rule restricts the Dock or an exclude rule hides it.
4. If Auto-hide is enabled, move the pointer into the configured activation area.
5. Temporarily enable the activation-area background to see exactly where the hitbox is.

## A position is missing from the dropdown

Another Dock preset already owns it. Positions are exclusive, and a disabled preset still reserves its position.

Check every preset and move or delete the one using that position.

## The trigger is invisible but the Dock still opens

This is expected when the trigger pill or activation-area background is hidden. The activation hitbox can remain active while completely transparent.

## The Dock is hard to reveal

Increase **Trigger → Activation thickness**. The visual pill can be thin while the invisible hitbox remains larger.

Also check **Reveal delay**; a long delay requires the pointer to remain over the activation area longer.

## The Dock disappears before I can reach it

Increase **Trigger → Hide delay**.

## An external built-in icon does not appear while offline

Obsidian/Lucide icons are local. Tabler, Material Design Icons, Phosphor, and Bootstrap Icons need a network connection when first searched or selected.

After an external icon has been selected and cached, Ledge can restore that retained icon offline.

## A vault image looks monochrome

Open that item's settings and change **Image rendering** from **Tint** to **Original colors**.

## Import is rejected

Make sure the file is a JSON backup exported by Ledge and is no larger than 1 MB. Unsupported future backup formats are intentionally rejected.

## A shortcut shows a warning

Check the item's **Target path**. The file may have been deleted or moved outside the path Ledge currently stores.
