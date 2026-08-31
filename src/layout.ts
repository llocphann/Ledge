import type { CornerLayout, CornerSlot, DockPosition } from "./types";

export function isCornerPosition(position: DockPosition): boolean {
  return position.includes("-");
}

export function isVerticalPosition(position: DockPosition): boolean {
  return position === "left" || position === "right";
}

export function computeCornerLayout(position: DockPosition, itemCount: number): CornerLayout {
  if (!isCornerPosition(position) || itemCount <= 0) {
    return { columns: 0, rows: 0, horizontalCount: 0, slots: [] };
  }

  const horizontalCount = Math.ceil(itemCount / 2);
  const columns = horizontalCount;
  const rows = itemCount - horizontalCount + 1;
  const slots: CornerSlot[] = [];
  const isRight = position.endsWith("right");
  const isBottom = position.startsWith("bottom");

  for (let index = 0; index < itemCount; index += 1) {
    if (index < horizontalCount) {
      slots.push({
        column: isRight ? columns - index : index + 1,
        row: isBottom ? rows : 1,
      });
      continue;
    }

    const verticalOffset = index - horizontalCount + 1;
    slots.push({
      column: isRight ? columns : 1,
      row: isBottom ? rows - verticalOffset : verticalOffset + 1,
    });
  }

  return { columns, rows, horizontalCount, slots };
}
