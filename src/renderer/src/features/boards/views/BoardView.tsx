import { memo, useState, type FormEvent } from "react";

import { COLUMN_TITLES, COLUMNS, type Column } from "../../../../../shared/api";
import { BoardSkeleton, cls } from "../../../platform/ui/primitives";
import { CardTile, useCardTitle } from "../../cards";
import { useIsSelectedCard, useLocation, useNavigationActions } from "../../navigation";
import {
  useBoardActions,
  useBoardFilter,
  useBoardName,
  useBoardPending,
  useColumn,
  useMoveError,
  usePendingCards,
} from "../hooks";

/**
 * A board and its cards. Every component below takes IDs and reads its own slice, so a change
 * re-renders only the components whose slice changed.
 */
export function BoardView({ boardId }: { boardId: string }) {
  if (useBoardPending(boardId)) return <BoardSkeleton />;
  return (
    <section className="board">
      <header className="board-header">
        <BoardName boardId={boardId} />
        <FilterInput boardId={boardId} />
        <NewCard boardId={boardId} />
      </header>
      <MoveError boardId={boardId} />
      <div className="columns">
        {COLUMNS.map((column) => (
          <ColumnView key={column} boardId={boardId} column={column} />
        ))}
      </div>
      <ChatToggle />
    </section>
  );
}

/** Opens the board chat in the side panel. Positioned at the bottom left of the board area. */
function ChatToggle() {
  const open = useLocation((s) => s.chatOpen);
  const { toggleChat } = useNavigationActions();
  return (
    <button type="button" className={cls("chat-toggle", open && "active")} onClick={toggleChat} aria-pressed={open}>
      Board chat
    </button>
  );
}

function BoardName({ boardId }: { boardId: string }) {
  return <h1>{useBoardName(boardId)}</h1>;
}

function FilterInput({ boardId }: { boardId: string }) {
  const filter = useBoardFilter(boardId);
  const { setFilter } = useBoardActions();
  return (
    <input
      className="filter"
      value={filter}
      onChange={(event) => setFilter(boardId, event.target.value)}
      placeholder="Filter cards"
      aria-label="Filter cards"
    />
  );
}

function MoveError({ boardId }: { boardId: string }) {
  const error = useMoveError(boardId);
  return error && <div className="notice error">{error} The move was undone.</div>;
}

function ColumnView({ boardId, column }: { boardId: string; column: Column }) {
  const { cardIds, limit } = useColumn(boardId, column);
  const overLimit = limit !== null && cardIds.length > limit;
  return (
    <div className={cls("column", overLimit && "over-limit")} data-testid="column">
      <div className="column-header">
        <span>{COLUMN_TITLES[column]}</span>
        <span className="count">
          {cardIds.length}
          {limit !== null && ` / ${limit}`}
        </span>
      </div>
      {overLimit && <div className="limit-warning">Over the WIP limit</div>}
      <div className="cards">
        {cardIds.map((cardId) => (
          <BoardCard key={cardId} boardId={boardId} cardId={cardId} column={column} />
        ))}
        {column === "todo" && <PendingCards boardId={boardId} />}
      </div>
    </div>
  );
}

/**
 * A card as this board places it: the cards feature's tile, plus the board's move controls. Hides
 * itself when it doesn't match the filter, so the column doesn't need every card's title. A list
 * row, so memo (see ChatLine).
 */
const BoardCard = memo(function BoardCard({ boardId, cardId, column }: { boardId: string; cardId: string; column: Column }) {
  const filter = useBoardFilter(boardId).trim().toLowerCase();
  const title = useCardTitle(cardId);
  const selected = useIsSelectedCard(cardId);
  const { selectCard } = useNavigationActions();
  const { moveCard } = useBoardActions();
  if (filter && !title?.toLowerCase().includes(filter)) return null;
  const index = COLUMNS.indexOf(column);
  const previous = COLUMNS[index - 1];
  const next = COLUMNS[index + 1];
  return (
    <CardTile
      cardId={cardId}
      selected={selected}
      onSelect={selectCard}
      actions={
        <>
          <button type="button" disabled={!previous} onClick={() => previous && moveCard(boardId, cardId, previous)} aria-label="Move left">
            ←
          </button>
          <button type="button" disabled={!next} onClick={() => next && moveCard(boardId, cardId, next)} aria-label="Move right">
            →
          </button>
        </>
      }
    />
  );
});

function PendingCards({ boardId }: { boardId: string }) {
  return usePendingCards(boardId).map(({ id, title }) => (
    <div key={id} className="card ghost">
      {title}
    </div>
  ));
}

function NewCard({ boardId }: { boardId: string }) {
  const name = useBoardName(boardId);
  const { createCard } = useBoardActions();
  const [title, setTitle] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    void createCard(boardId, title.trim());
    setTitle("");
  };
  return (
    <form className="new-card" onSubmit={submit}>
      <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`Add a card to ${name ?? ""}`} aria-label="New card title" />
      <button type="submit">Add</button>
    </form>
  );
}
