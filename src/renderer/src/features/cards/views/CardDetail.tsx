import type { ReactNode } from "react";

import { PanelHeader, SkeletonLines } from "../../../platform/ui/primitives";
import { useCard, useComments } from "../hooks";

export interface CardDetailProps {
  cardId: string;
  onClose: () => void;
  /** Fields from whoever placed the card, such as its board column. */
  fields?: ReactNode;
}

/**
 * A card's detail, as side-panel content: the shell owns the panel. The card opens instantly from its cached content; only its comments load (and they were
 * probably prefetched when the pointer passed over the card).
 */
export function CardDetail({ cardId, onClose, fields }: CardDetailProps) {
  const card = useCard(cardId).data;
  return (
    <>
      <PanelHeader title={card?.title}>
        <button type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </PanelHeader>
      <div className="panel-body detail">
        <dl className="detail-fields">
          {fields}
          <dt>Assignee</dt>
          <dd>{card?.assignee ?? "Unassigned"}</dd>
        </dl>
        <h3>Comments</h3>
        <Comments cardId={cardId} expected={card?.commentCount ?? 1} />
      </div>
    </>
  );
}

function Comments({ cardId, expected }: { cardId: string; expected: number }) {
  const { data: comments, isPending } = useComments(cardId);
  if (isPending || !comments) return <SkeletonLines lines={expected} />;
  if (comments.length === 0) return <p className="muted">No comments yet.</p>;
  return (
    <ul className="comments">
      {comments.map((comment) => (
        <li key={comment.id}>
          <strong>{comment.author}</strong> {comment.body}
        </li>
      ))}
    </ul>
  );
}
