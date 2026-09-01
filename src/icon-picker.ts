import { App, Modal, getIconIds, setIcon } from "obsidian";

const LUCIDE_PREFIX = "lucide-";
const SEARCH_RESULT_LIMIT = 240;

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
    this.titleEl.setText("Choose a Lucide icon");
    this.contentEl.empty();
    this.addStyles();

    const search = this.contentEl.createEl("input", {
      cls: "ledge-icon-picker-search",
      attr: {
        type: "search",
        placeholder: `Search ${this.allIcons.length.toLocaleString()} icons…`,
        "aria-label": "Search Lucide icons",
        autocomplete: "off",
      },
    });
    const status = this.contentEl.createDiv({ cls: "ledge-icon-picker-status" });
    const grid = this.contentEl.createDiv({ cls: "ledge-icon-picker-grid" });

    const render = (): void => {
      const query = search.value.trim().toLowerCase();
      const available = new Set(this.allIcons);
      let icons: string[];

      if (query) {
        icons = this.allIcons
          .filter((icon) => matchesQuery(icon, query))
          .sort((left, right) => compareMatches(left, right, query));
      } else {
        const suggested = DEFAULT_DOCK_ICONS.filter((icon) => available.has(icon));
        icons = this.currentIcon && available.has(this.currentIcon)
          ? [this.currentIcon, ...suggested.filter((icon) => icon !== this.currentIcon)]
          : [...suggested];
      }

      const visibleIcons = icons.slice(0, SEARCH_RESULT_LIMIT);
      grid.empty();

      if (visibleIcons.length === 0) {
        status.setText("No matching icons");
        return;
      }

      if (!query) {
        status.setText(`Popular dock icons · ${this.allIcons.length.toLocaleString()} available in Obsidian`);
      } else if (icons.length > SEARCH_RESULT_LIMIT) {
        status.setText(`${icons.length.toLocaleString()} matches · showing the first ${SEARCH_RESULT_LIMIT}`);
      } else {
        status.setText(`${icons.length.toLocaleString()} match${icons.length === 1 ? "" : "es"}`);
      }

      for (const icon of visibleIcons) {
        const button = grid.createEl("button", {
          cls: `ledge-icon-picker-item${icon === this.currentIcon ? " is-selected" : ""}`,
          attr: {
            type: "button",
            title: icon,
            "aria-label": `Use ${icon} icon`,
            "aria-pressed": String(icon === this.currentIcon),
          },
        });
        const preview = button.createSpan({ cls: "ledge-icon-picker-preview" });
        setIcon(preview, icon);
        button.createSpan({ cls: "ledge-icon-picker-name", text: icon });
        button.addEventListener("click", () => {
          this.onChoose(icon);
          this.close();
        });
      }
    };

    search.addEventListener("input", render);
    render();
    search.focus();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private addStyles(): void {
    this.contentEl.createEl("style", {
      text: `
        .ledge-icon-picker-search {
          width: 100%;
          margin-bottom: var(--size-4-2);
        }
        .ledge-icon-picker-status {
          color: var(--text-muted);
          font-size: var(--font-ui-smaller);
          margin-bottom: var(--size-4-3);
        }
        .ledge-icon-picker-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
          gap: var(--size-4-2);
          max-height: min(60vh, 560px);
          overflow-y: auto;
          padding: var(--size-4-1);
        }
        .ledge-icon-picker-item {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: var(--size-4-2);
          justify-content: flex-start;
          padding: var(--size-4-2);
        }
        .ledge-icon-picker-item.is-selected {
          box-shadow: 0 0 0 2px var(--interactive-accent);
        }
        .ledge-icon-picker-preview {
          display: inline-flex;
          flex: 0 0 auto;
        }
        .ledge-icon-picker-preview > svg {
          width: 18px;
          height: 18px;
        }
        .ledge-icon-picker-name {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: var(--font-ui-smaller);
        }
      `,
    });
  }
}
