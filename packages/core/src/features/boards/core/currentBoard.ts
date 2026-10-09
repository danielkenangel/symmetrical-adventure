import type { BoardSummary } from "@state-demo/api";

/**
 * The board on screen: the one the user picked, else the first. A saved location can name a board
 * that no longer exists, so once the list has loaded, an unknown choice falls back to the first
 * board. Until then the choice is trusted, so a restored board paints from its own cache.
 */
export function currentBoardId(chosen: string | null, boards: readonly BoardSummary[] | undefined): string | null {
  const valid = chosen !== null && (boards === undefined || boards.some((board) => board.id === chosen));
  return valid ? chosen : (boards?.[0]?.id ?? null);
}
