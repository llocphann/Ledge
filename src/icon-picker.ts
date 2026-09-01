import {
  SuggestModal,
  getIconIds,
  setIcon,
  type App,
} from "obsidian";
import { iconDisplayName, type BuiltInIconChoice } from "./icon-catalog";
import { cachedIconifyChoices, searchIconifyIcons } from "./icon-provider";

const EMPTY_QUERY_LIMIT = 120;
const LOCAL_SEARCH_LIMIT = 48;
const TOTAL_SEARCH_LIMIT = 144;

function matchesQuery(choice: BuiltInIconChoice, query: string): boolean {
  if (!query) return true;
  return choice.name.toLocaleLowerCase().includes(query)
    || choice.id.toLocaleLowerCase().includes(query);
}

function availableLocalIcons(query: string): BuiltInIconChoice[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const byDisplayId = new Map<string, string>();

  for (const iconId of getIconIds()) {
    if (iconId.startsWith("iconify:")) continue;
    const displayId = iconId.replace(/^lucide-/, "");
    const existing = byDisplayId.get(displayId);
    if (!existing || existing.startsWith("lucide-")) {
      byDisplayId.set(displayId, iconId);
    }
  }

  const cached = cachedIconifyChoices()
    .filter((choice) => matchesQuery(choice, normalizedQuery));
  const obsidian = [...byDisplayId.values()]
    .map((id) => ({ id, name: iconDisplayName(id) }))
    .filter((choice) => matchesQuery(choice, normalizedQuery))
    .sort((left, right) => left.name.localeCompare(right.name));

  return [...cached, ...obsidian]
    .slice(0, normalizedQuery ? LOCAL_SEARCH_LIMIT : EMPTY_QUERY_LIMIT);
}

class LedgeIconPickerModal extends SuggestModal<BuiltInIconChoice> {
  constructor(
    app: App,
    private readonly onChoose: (iconId: string) => void,
  ) {
    super(app);
    this.limit = TOTAL_SEARCH_LIMIT;
    this.setPlaceholder("Search built-in icons…");

    Object.assign(this.modalEl.style, {
      width: "min(760px, 92vw)",
    });
    Object.assign(this.resultContainerEl.style, {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))",
      gap: "6px",
      padding: "8px",
      maxHeight: "min(68vh, 600px)",
      overflowY: "auto",
    });
  }

  async getSuggestions(query: string): Promise<BuiltInIconChoice[]> {
    const local = availableLocalIcons(query);
    if (!query.trim()) return local;

    let external: BuiltInIconChoice[] = [];
    try {
      external = await searchIconifyIcons(query);
    } catch {
      // Keep Obsidian and previously cached icons usable when the network is unavailable.
    }

    const seen = new Set(local.map((choice) => choice.id));
    return [
      ...local,
      ...external.filter((choice) => !seen.has(choice.id)),
    ].slice(0, TOTAL_SEARCH_LIMIT);
  }

  renderSuggestion(item: BuiltInIconChoice, el: HTMLElement): void {
    el.empty();
    el.setAttribute("aria-label", item.name);
    Object.assign(el.style, {
      minWidth: "0",
      height: "88px",
      padding: "10px 6px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "7px",
      textAlign: "center",
    });

    const preview = el.createDiv();
    Object.assign(preview.style, {
      width: "30px",
      height: "30px",
      display: "grid",
      placeItems: "center",
      flex: "0 0 auto",
    });
    setIcon(preview, item.id);
    const svg = preview.querySelector("svg");
    svg?.setAttribute("width", "28");
    svg?.setAttribute("height", "28");

    const name = el.createDiv({ text: item.name });
    Object.assign(name.style, {
      width: "100%",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      fontSize: "var(--font-ui-smaller)",
    });
  }

  onChooseSuggestion(item: BuiltInIconChoice, event: MouseEvent | KeyboardEvent): void {
    void event;
    this.onChoose(item.id);
  }
}

export function openIconPicker(
  app: App,
  onChoose: (iconId: string) => void,
): void {
  new LedgeIconPickerModal(app, onChoose).open();
}
