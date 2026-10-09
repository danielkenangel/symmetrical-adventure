import { useBoardListQuery } from "../boards";
import { useChosenBoardId } from "../navigation";
import { currentBoardId } from "./core";

/**
 * The board on screen. A cheap derivation, so each reader just calls it. `data` is usable while the
 * list loads: the choice is trusted until then.
 */
export function useCurrentBoardIdQuery(): { data: string | null; isPending: boolean } {
  const chosen = useChosenBoardId();
  const { data: boards, isPending } = useBoardListQuery();
  return { data: currentBoardId(chosen, boards), isPending };
}
