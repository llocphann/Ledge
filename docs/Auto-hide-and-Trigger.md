# Auto-hide and Trigger

The most important distinction in Ledge's auto-hide system is this:

**The activation area and the trigger pill are not the same thing.**

## Auto-hide

Enable **Behavior → Auto-hide** to hide the Dock when it is not being used. Enabling Auto-hide hides an already-visible Dock immediately.

When Auto-hide is off, the Dock stays visible and Trigger settings are not used.

## Activation area

The **activation area** is the pointer-sensitive hitbox attached to the Dock edge. Moving the pointer into this area can reveal the Dock.

- **Activation thickness** controls how far the hitbox extends inward from the edge.
- **Activation length** controls the hitbox length on straight edges.
- **Reveal delay** controls how long the pointer must remain there before the Dock appears.
- **Hide delay** controls how long the Dock stays visible after the pointer leaves.

The activation area's background and border are optional visual aids. Turning them off does **not** disable the hitbox. This lets you use a completely invisible edge activation zone.

## Trigger pill

The **trigger pill** is the smaller visual indicator drawn inside the activation area.

**Show trigger pill** can be turned off while leaving the activation area active. The Dock can therefore still reveal from the edge even when no pill is visible.

The pill has independent controls for surface thickness, background, theme/solid/gradient mode, opacity, gradient direction, radius, and border.

## Activation area appearance

The larger hitbox can also have its own background, opacity, gradient, radius, border width, and border color. These settings change what the hitbox looks like; they do not change its pointer-sensitive dimensions.

## Corner triggers

At corner positions, the visible trigger is formed from two rounded perpendicular arms. The pointer-sensitive corner area remains larger than the visible arms so the corner is practical to hit.

## Tuning tips

- Hard to reveal: increase **Activation thickness** before increasing the visible pill size.
- Opens accidentally: increase **Reveal delay** or reduce the activation area.
- Disappears too quickly: increase **Hide delay**.
