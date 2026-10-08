import { defineStore } from "../../../platform/core/defineStore";

export const LOCATION_STORAGE_KEY = "state-demo:location";

export type View = "board" | "settings";

/** Where the user is. Client state only; saved on change and restored before the first paint. */
export interface LocationState {
  view: View;
  boardId: string | null;
  selectedCardId: string | null;
  /** Whether the side panel shows the board chat. Otherwise it shows the open card, if any. */
  chatOpen: boolean;
}

export interface NavigationDeps {
  storage: Storage | null;
}

export function createNavigation(deps: NavigationDeps) {
  const initial: LocationState = parseLocation(deps.storage?.getItem(LOCATION_STORAGE_KEY) ?? null) ?? {
    view: "board",
    boardId: null,
    selectedCardId: null,
    chatOpen: false,
  };
  const store = defineStore({
    name: "navigation",
    initialState: initial,
    actions: (set) => ({
      showBoard: (boardId: string) =>
        set("showBoard", (s) => (s.boardId === boardId ? { view: "board" } : { view: "board", boardId, selectedCardId: null })),
      showSettings: () => set("showSettings", { view: "settings" }),
      /** Opening a card shows it in the side panel, in place of the chat. */
      selectCard: (cardId: string | null) =>
        set("selectCard", cardId ? { selectedCardId: cardId, chatOpen: false } : { selectedCardId: null }),
      toggleChat: () => set("toggleChat", (s) => ({ chatOpen: !s.chatOpen })),
    }),
  });

  return {
    store,
    start(): () => void {
      return store.watch(
        (s) => [s.view, s.boardId, s.selectedCardId, s.chatOpen] as const,
        ([view, boardId, selectedCardId, chatOpen]) =>
          deps.storage?.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ view, boardId, selectedCardId, chatOpen })),
      );
    },
  };
}

export type Navigation = ReturnType<typeof createNavigation>;

/** Parses a saved location, or returns null for anything that doesn't have the expected shape. */
export function parseLocation(raw: string | null): LocationState | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { view, boardId, selectedCardId, chatOpen } = value as Record<string, unknown>;
    if (view !== "board" && view !== "settings") return null;
    const id = (candidate: unknown) => (typeof candidate === "string" ? candidate : null);
    return { view, boardId: id(boardId), selectedCardId: id(selectedCardId), chatOpen: chatOpen === true };
  } catch {
    return null;
  }
}
