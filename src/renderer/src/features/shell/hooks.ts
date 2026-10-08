import { useBoardList } from "../boards";
import { useLocation } from "../navigation";
import { currentBoardId } from "./core";

/** The board on screen. A cheap derivation, so each reader just calls it. */
export function useCurrentBoardId(): string | null {
  const chosen = useLocation((s) => s.boardId);
  return currentBoardId(chosen, useBoardList().data);
}
