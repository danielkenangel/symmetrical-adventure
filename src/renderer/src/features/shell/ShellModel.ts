import { computed } from "mobx";

import type { BoardModel, Boards } from "../boards";
import type { Navigation } from "../navigation";

export interface ShellModelDeps {
  navigation: Pick<Navigation, "location">;
  boards: Pick<Boards, "list" | "model">;
}

/** What's on screen. The one place navigation and boards meet, so neither depends on the other. */
export class ShellModel {
  constructor(private readonly deps: ShellModelDeps) {}

  /**
   * The board on screen: the one the user picked, else the first. A saved location can name a
   * board that no longer exists, so once the list has loaded, an unknown choice falls back to the
   * first board. Until then the choice is trusted, so a restored board paints from its own cache.
   */
  @computed get currentBoard(): BoardModel | null {
    const chosen = this.deps.navigation.location.boardId;
    const boards = this.deps.boards.list.data;
    const valid = chosen !== null && (boards === undefined || boards.some((board) => board.id === chosen));
    const boardId = valid ? chosen : boards?.[0]?.id;
    return boardId ? this.deps.boards.model(boardId) : null;
  }
}
