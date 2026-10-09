import { COLUMN_TITLES } from "@state-demo/api";
import { useCardColumnQuery, useOpenCardIdQuery } from "@state-demo/core/features/boards";
import { useNavigationActions } from "@state-demo/core/features/navigation";

import { CardDetail, Field } from "../cards";

/** The open card's detail, or nothing if no card on this board is open. */
export function SelectedCard({ boardId }: { boardId: string }) {
  const cardId = useOpenCardIdQuery(boardId).data;
  const { selectCard } = useNavigationActions();
  const column = useCardColumnQuery(boardId, cardId ?? "").data;
  if (!cardId || !column) return null;
  return (
    <CardDetail
      key={cardId}
      cardId={cardId}
      onClose={() => selectCard(null)}
      fields={<Field label="Status" value={COLUMN_TITLES[column]} />}
    />
  );
}
