import { COLUMN_TITLES } from "../../../../../shared/api";
import { CardDetail } from "../../cards";
import { useNavigationActions } from "../../navigation";
import { useCardColumn, useOpenCardId } from "../hooks";

/** The open card's detail, as side-panel content, or nothing if no card on this board is open. */
export function SelectedCard({ boardId }: { boardId: string }) {
  const cardId = useOpenCardId(boardId);
  const { selectCard } = useNavigationActions();
  const column = useCardColumn(boardId, cardId ?? "");
  if (!cardId || !column) return null;
  return (
    <CardDetail
      key={cardId}
      cardId={cardId}
      onClose={() => selectCard(null)}
      fields={
        <>
          <dt>Status</dt>
          <dd>{COLUMN_TITLES[column]}</dd>
        </>
      }
    />
  );
}
