import { observer } from "mobx-react-lite";

import { COLUMN_TITLES } from "../../../shared/api";
import { useApp } from "../app/AppContext";
import type { BoardModel } from "../models/BoardModel";
import { SkeletonLines } from "../ui/primitives";

/**
 * The card opens instantly from the board's data; only its comments load (and they were
 * probably prefetched when the pointer passed over the card).
 */
export const CardDetail = observer(function CardDetail({ board, cardId }: { board: BoardModel; cardId: string }) {
  const { session, location } = useApp();
  const card = board.card(cardId);
  const detail = session.card(cardId);
  if (!card) return null;
  return (
    <aside className="detail">
      <header className="detail-header">
        <h2>{card.title}</h2>
        <button type="button" onClick={() => location.selectCardAction(null)} aria-label="Close">
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
