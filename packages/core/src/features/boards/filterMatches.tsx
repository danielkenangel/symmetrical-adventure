import { createContext, use, type ReactNode } from "react";

import { useCardIdsWhereQuery } from "../cards";
import { useBoardCardIdsQuery, useBoardFilter } from "./hooks";

/** The cards matching the board's filter, or null when there's no filter. Read only through the hooks below. */
const FilterMatchesContext = createContext<readonly string[] | null>(null);

export function FilterMatchesProvider({ boardId, children }: { boardId: string; children: ReactNode }) {
  const filter = useBoardFilter(boardId).trim().toLowerCase();
  const cardIds = useBoardCardIdsQuery(boardId).data ?? NO_IDS;
  const matches = useCardIdsWhereQuery(filter ? cardIds : NO_IDS, (card) => card.title.toLowerCase().includes(filter)).data;
  return <FilterMatchesContext value={filter ? matches : null}>{children}</FilterMatchesContext>;
}

/** The given cards that match the board's filter, in order: all of them when there's no filter. */
export function useMatchingCardIds(cardIds: readonly string[]): readonly string[] {
  const matches = use(FilterMatchesContext);
  return matches ? cardIds.filter((cardId) => matches.includes(cardId)) : cardIds;
}

const NO_IDS: readonly string[] = [];
