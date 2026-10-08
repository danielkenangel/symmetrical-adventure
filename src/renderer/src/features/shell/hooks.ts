import { useBoardList } from "../boards";
import { useChosenBoardId } from "../navigation";
import { currentBoardId } from "./core";

/** The board on screen. A cheap derivation, so each reader just calls it. */
export function useCurrentBoardId(): string | null {
  const chosen = useChosenBoardId();
  return currentBoardId(chosen, useBoardList().data);
}
