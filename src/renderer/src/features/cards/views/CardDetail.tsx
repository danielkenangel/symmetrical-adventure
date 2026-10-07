import { observer } from "mobx-react-lite";

import { COLUMN_TITLES } from "../../../../../shared/api";
import { SkeletonLines } from "../../../platform/ui/primitives";
import type { BoardModel } from "../../boards";
import { useCards } from "../cards";

/**
 * The card opens instantly from the board's data; only its comments load (and they were
 * probably prefetched when the pointer passed over the card).
 */
export const CardDetail = observer(function CardDetail({ board, cardId, onClose }: { board: BoardModel; cardId: string; onClose: () => void }) {
  const card = board.card(cardId);
  const detail = useCards().model(cardId);
  if (!card) return null;
  return (
    <aside className="detail">
      <header className="detail-header">
        <h2>{card.title}</h2>
        <button type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>
      <dl className="detail-fields">
        <dt>Status</dt>
        <dd>{COLUMN_TITLES[card.column]}</dd>
        <dt>Assignee</dt>
        <dd>{card.assignee ?? "Unassigned"}</dd>
      </dl>
      <h3>Comments</h3>
      {detail.isLoading ? (
        <SkeletonLines lines={card.commentCount} />
      ) : detail.comments.length === 0 ? (
        <p className="muted">No comments yet.</p>
      ) : (
        <ul className="comments">
          {detail.comments.map((comment) => (
            <li key={comment.id}>
              <strong>{comment.author}</strong> {comment.body}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
});
