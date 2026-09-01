import { App, Modal, Setting, getIconIds } from "obsidian";

const LUCIDE_PREFIX = "lucide-";
const SEARCH_RESULT_LIMIT = 120;

const DEFAULT_DOCK_ICONS = [
  "home",
  "search",
  "inbox",
  "file-text",
  "files",
  "folder",
  "folder-open",
  "book-open",
  "library",
  "bookmark",
  "star",
  "heart",
  "pin",
  "map-pin",
  "calendar",
  "clock",
  "timer",
  "check-square",
  "list-todo",
  "list",
  "layout-dashboard",
  "table",
  "database",
  "canvas",
  "pen-line",
  "pencil",
  "highlighter",
  "message-square",
  "mail",
  "bell",
  "rss",
  "globe",
  "link",
  "external-link",
  "command",
  "terminal",
  "code-2",
  "braces",
  "settings",
  "wrench",
  "palette",
  "image",
  "camera",
  "music",
  "headphones",
  "video",
  "play",
  "gamepad-2",
  "dumbbell",
  "activity",
  "footprints",
  "bike",
  "plane",
  "car",
  "coffee",
  "utensils",
  "shopping-cart",
  "wallet",
  "credit-card",
  "briefcase-business",
  "graduation-cap",
  "lightbulb",
  "brain",
  "sparkles",
  "zap",
  "flame",
  "sun",
  "moon",
  "cloud",
  "shield",
  "lock",
  "key-round",
  "user",
  "users",
  "contact",
  "circle-help",
  "info",
] as const;

function getLucideIconNames(): string[] {
  const icons = getIconIds()
    .map((icon) => String(icon))
    .filter((icon) => icon.startsWith(LUCIDE_PREFIX))
    .map((icon) => icon.slice(LUCIDE_PREFIX.length));
  return [...new Set(icons)].sort((left, right) => left.localeCompare(right));
}

function matchesQuery(icon: string, query: string): boolean {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  return terms.length === 0 || terms.every((term) => icon.includes(term));
}

function compareMatches(left: string, right: string, query: string): number {
  const normalized = query.trim().toLowerCase();
  const leftStarts = left.startsWith(normalized);
  const rightStarts = right.startsWith(normalized);
  if (leftStarts !== rightStarts) return leftStarts ? -1 : 1;
  return left.localeCompare(right);
}

export class IconPickerModal extends Modal {
  private readonly allIcons: string[];

  constructor(
    app: App,
    private readonly currentIcon: string,
    private readonly onChoose: (icon: string) => void,
  ) {
    super(app);
    this.allIcons = getLucideIconNames();
  }

  onOpen(): void {
    this.titleEl.setText("Choose an icon");
    this.contentEl.empty();

    let query = "";
    let searchInput: HTMLInputElement | null = null;
    const status = this.contentEl.createEl("p", { cls: "setting-item-description" });
    const results = this.contentEl.createDiv();

    const render = (): void => {
      const normalizedQuery = query.trim().toLowerCase();
      const available = new Set(this.allIcons);
      let icons: string[];

      if (normalizedQuery) {
        icons = this.allIcons
          .filter((icon) => matchesQuery(icon, normalizedQuery))
          .sort((left, right) => compareMatches(left, right, normalizedQuery));
      } else {
        const suggested = DEFAULT_DOCK_ICONS.filter((icon) => available.has(icon));
        icons = this.currentIcon && available.has(this.currentIcon)
          ? [this.currentIcon, ...suggested.filter((icon) => icon !== this.currentIcon)]
          : [...suggested];
      }

      const visibleIcons = icons.slice(0, SEARCH_RESULT_LIMIT);
      results.empty();

      if (visibleIcons.length === 0) {
        status.setText("No matching icons");
        return;
      }

      if (!normalizedQuery) {
        status.setText(`Popular dock icons · ${this.allIcons.length.toLocaleString()} available in Obsidian`);
      } else if (icons.length > SEARCH_RESULT_LIMIT) {
        status.setText(`${icons.length.toLocaleString()} matches · showing the first ${SEARCH_RESULT_LIMIT}`);
      } else {
        status.setText(`${icons.length.toLocaleString()} match${icons.length === 1 ? "" : "es"}`);
      }

      for (const icon of visibleIcons) {
        const row = new Setting(results).setName(icon);
        if (icon === this.currentIcon) row.setDesc("Current icon");
        row.addButton((button) =>
          button
            .setIcon(icon)
            .setTooltip(`Use ${icon}`)
            .onClick(() => {
              this.onChoose(icon);
              this.close();
            }),
        );
      }
    };

    new Setting(this.contentEl)
      .setName("Search icons")
      .addSearch((search) => {
        searchInput = search.inputEl;
        search
          .setPlaceholder(`Search ${this.allIcons.length.toLocaleString()} icons…`)
          .onChange((value) => {
            query = value;
            render();
          });
      });

    render();
    searchInput?.focus();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
