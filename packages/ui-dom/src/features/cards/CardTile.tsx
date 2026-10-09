import type { ReactNode } from "react";

import { useCardActions, useCardQuery } from "@state-demo/core/features/cards";

import { cls } from "../../ui/primitives";

export interface CardTileProps {
  cardId: string;
  selected: boolean;
  onSelect: (cardId: string) => void;
  /** Controls from whoever places the card, such as a board's move buttons. */
  actions?: ReactNode;
}

/** A card in a list. Reads its own entry, and warms its comments on hover so opening it is instant. */
export function CardTile({ cardId, selected, onSelect, actions }: CardTileProps) {
  const { data: card, isPending } = useCardQuery(cardId);
  const { prefetchComments } = useCardActions();
  if (isPending || !card) return <div className="card ghost">Loading…</div>;
  return (
    <div className={cls("card", selected && "selected")} onMouseEnter={() => prefetchComments(cardId)} onClick={() => onSelect(cardId)}>
      <div className="card-title">{card.title}</div>
      <div className="card-meta">
        <span>{card.assignee ?? "Unassigned"}</span>
        {card.commentCount > 0 && <span>{card.commentCount} comments</span>}
      </div>
      {actions && (
        <div className="card-actions" onClick={(event) => event.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
}
