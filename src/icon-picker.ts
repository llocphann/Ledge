import {
  FuzzySuggestModal,
  getIconIds,
  setIcon,
  type App,
  type FuzzyMatch,
} from "obsidian";

function iconDisplayName(iconId: string): string {
  return iconId
    .replace(/^lucide-/, "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.length <= 2
      ? part.toUpperCase()
      : `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function availableIconIds(): string[] {
  const byDisplayId = new Map<string, string>();

  for (const iconId of getIconIds()) {
    const displayId = iconId.replace(/^lucide-/, "");
    const existing = byDisplayId.get(displayId);
    if (!existing || existing.startsWith("lucide-")) {
      byDisplayId.set(displayId, iconId);
    }
  }

  return [...byDisplayId.values()].sort((left, right) =>
    iconDisplayName(left).localeCompare(iconDisplayName(right)),
  );
}

class LedgeIconPickerModal extends FuzzySuggestModal<string> {
  constructor(
    app: App,
    private readonly onChoose: (iconId: string) => void,
  ) {
    super(app);
    this.setPlaceholder("Search icons (home, book, calendar, settings…)");
  }

  getItems(): string[] {
    return availableIconIds();
  }

  getItemText(item: string): string {
    return `${iconDisplayName(item)} ${item}`;
  }

  renderSuggestion(match: FuzzyMatch<string>, el: HTMLElement): void {
    el.addClass("ledge-icon-picker-suggestion");

    const preview = el.createSpan({ cls: "ledge-icon-picker-suggestion-icon" });
    setIcon(preview, match.item);

    const text = el.createDiv({ cls: "ledge-icon-picker-suggestion-text" });
    text.createDiv({
      cls: "ledge-icon-picker-suggestion-name",
      text: iconDisplayName(match.item),
    });
    text.createEl("code", {
      cls: "ledge-icon-picker-suggestion-id",
      text: match.item,
    });
  }

  onChooseItem(item: string, event: MouseEvent | KeyboardEvent): void {
    void event;
    this.onChoose(item);
  }
}

export function openIconPicker(
  app: App,
  onChoose: (iconId: string) => void,
): void {
  new LedgeIconPickerModal(app, onChoose).open();
}
