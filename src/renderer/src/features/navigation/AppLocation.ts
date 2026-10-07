import { action, computed, observable } from "mobx";

export type View = "board" | "settings";

export interface LocationSnapshot {
  view: View;
  boardId: string | null;
  selectedCardId: string | null;
}

/** Where the user is. Client state only; saved on change and restored before the first paint. */
export class AppLocation {
  @observable accessor view: View = "board";
  @observable accessor boardId: string | null = null;
  @observable accessor selectedCardId: string | null = null;

  @computed.struct get snapshot(): LocationSnapshot {
    return { view: this.view, boardId: this.boardId, selectedCardId: this.selectedCardId };
  }

  @action showBoardAction(boardId: string): void {
    this.view = "board";
    if (this.boardId === boardId) return;
    this.boardId = boardId;
    this.selectedCardId = null;
  }

  @action showSettingsAction(): void {
    this.view = "settings";
  }

  @action selectCardAction(cardId: string | null): void {
    this.selectedCardId = cardId;
  }

  @action restoreAction(snapshot: LocationSnapshot): void {
    this.view = snapshot.view;
    this.boardId = snapshot.boardId;
    this.selectedCardId = snapshot.selectedCardId;
  }
}

/** Parses a saved location, or returns null for anything that doesn't have the expected shape. */
export function parseLocation(raw: string | null): LocationSnapshot | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { view, boardId, selectedCardId } = value as Record<string, unknown>;
    if (view !== "board" && view !== "settings") return null;
    const id = (candidate: unknown) => (typeof candidate === "string" ? candidate : null);
    return { view, boardId: id(boardId), selectedCardId: id(selectedCardId) };
  } catch {
    return null;
  }
}
