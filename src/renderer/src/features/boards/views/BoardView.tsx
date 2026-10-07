import { observer } from "mobx-react-lite";
import { useCallback, useState, type FormEvent } from "react";

import { COLUMN_TITLES, COLUMNS, type Column } from "../../../../../shared/api";
import { BoardSkeleton, cls } from "../../../platform/ui/primitives";
import type { BoardModel } from "../BoardModel";
import { useCreateCard, useMoveCard, usePendingCards, type PendingCard } from "../hooks";

type MoveCard = (cardId: string, column: Column) => void;
const NO_PENDING: PendingCard[] = [];

/**
 * Selection and what happens on hover belong to other features (navigation, cards), so they come in
 * as props: the boards feature doesn't depend on either. Pass stable callbacks.
 */
export interface BoardViewProps {
  board: BoardModel;
  selectedCardId: string | null;
  onSelectCard: (cardId: string) => void;
  onCardHover?: (cardId: string) => void;
}

interface CardEvents {
  onMove: MoveCard;
  onSelectCard: (cardId: string) => void;
  onCardHover?: (cardId: string) => void;
}

export const BoardView = observer(function BoardView({ board, selectedCardId, onSelectCard, onCardHover }: BoardViewProps) {
  const { mutate, error, isError } = useMoveCard(board.id);
  // No React Compiler here: the callback is stabilized by hand, so the memoized rows below don't
  // re-render just because the board did.
  const onMove = useCallback<MoveCard>((cardId, column) => mutate({ cardId, column }), [mutate]);
  const pending = usePendingCards(board.id);

  if (board.isLoading) return <BoardSkeleton />;
  return (
    <section className="board">
      <header className="board-header">
        <h1>{board.name}</h1>
        <input
          className="filter"
          value={board.filter}
          onChange={(event) => board.setFilterAction(event.target.value)}
          placeholder="Filter cards"
          aria-label="Filter cards"
        />
        <NewCard board={board} />
      </header>
      {isError && <div className="notice error">{error.message} The move was undone.</div>}
      <div className="columns">
        {board.columns.map((column) => (
          <ColumnView
            key={column}
            board={board}
            column={column}
            pending={column === "todo" ? pending : NO_PENDING}
            selectedCardId={selectedCardId}
            onMove={onMove}
            onSelectCard={onSelectCard}
            onCardHover={onCardHover}
          />
        ))}
      </div>
    </section>
  );
});

const ColumnView = observer(function ColumnView({
  board,
  column,
  pending,
  selectedCardId,
  ...events
}: { board: BoardModel; column: Column; pending: PendingCard[]; selectedCardId: string | null } & CardEvents) {
  const view = board.column(column);
  return (
    <div className={cls("column", view.overLimit && "over-limit")} data-testid="column">
      <div className="column-header">
        <span>{COLUMN_TITLES[column]}</span>
        <span className="count">
          {view.total}
          {view.limit !== null && ` / ${view.limit}`}
        </span>
      </div>
      {view.overLimit && <div className="limit-warning">Over the WIP limit</div>}
      <div className="cards">
        {view.cardIds.map((cardId) => (
          <CardTile key={cardId} board={board} cardId={cardId} selected={cardId === selectedCardId} {...events} />
        ))}
        {pending.map(({ title, id }) => (
          <div key={id} className="card ghost">
            {title}
          </div>
        ))}
      </div>
    </div>
  );
});

/** A card. Only re-renders when its own card object changes (moves elsewhere keep it identical). */
const CardTile = observer(function CardTile({
  board,
  cardId,
  selected,
  onMove,
  onSelectCard,
  onCardHover,
}: { board: BoardModel; cardId: string; selected: boolean } & CardEvents) {
  const card = board.card(cardId);
  if (!card) return null;
  const index = COLUMNS.indexOf(card.column);
  const previous = COLUMNS[index - 1];
  const next = COLUMNS[index + 1];
  return (
    <div
      className={cls("card", selected && "selected")}
      onMouseEnter={() => onCardHover?.(card.id)}
      onClick={() => onSelectCard(card.id)}
    >
      <div className="card-title">{card.title}</div>
      <div className="card-meta">
        <span>{card.assignee ?? "Unassigned"}</span>
        {card.commentCount > 0 && <span>{card.commentCount} comments</span>}
      </div>
      <div className="card-actions" onClick={(event) => event.stopPropagation()}>
        <button type="button" disabled={!previous} onClick={() => previous && onMove(card.id, previous)} aria-label="Move left">
          ←
        </button>
        <button type="button" disabled={!next} onClick={() => next && onMove(card.id, next)} aria-label="Move right">
          →
        </button>
      </div>
    </div>
  );
});

const NewCard = observer(function NewCard({ board }: { board: BoardModel }) {
  const { mutate } = useCreateCard(board.id);
  const [title, setTitle] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    mutate(title.trim());
    setTitle("");
  };
  return (
    <form className="new-card" onSubmit={submit}>
      <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`Add a card to ${board.name}`} aria-label="New card title" />
      <button type="submit">Add</button>
    </form>
  );
});
