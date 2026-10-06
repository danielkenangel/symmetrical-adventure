import { useMutationState } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { useCallback, useState, type FormEvent } from "react";

import { COLUMN_TITLES, COLUMNS, type Column } from "../../../shared/api";
import { useApp } from "../app/AppContext";
import { useCreateCard, useMoveCard } from "../data/mutations";
import { keys } from "../data/queries";
import type { BoardModel } from "../models/BoardModel";
import { BoardSkeleton, cls } from "../ui/primitives";

type MoveCard = (cardId: string, column: Column) => void;

export const BoardView = observer(function BoardView({ board }: { board: BoardModel }) {
  const { mutate, error, isError } = useMoveCard(board.id);
  // No React Compiler here: the callback is stabilized by hand, so the memoized rows below don't
  // re-render just because the board did.
  const onMove = useCallback<MoveCard>((cardId, column) => mutate({ cardId, column }), [mutate]);

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
          <ColumnView key={column} board={board} column={column} onMove={onMove} />
        ))}
      </div>
    </section>
  );
});

const ColumnView = observer(function ColumnView({ board, column, onMove }: { board: BoardModel; column: Column; onMove: MoveCard }) {
  const view = board.column(column);
  // Cards being created render from the pending mutation's input, not from the cache.
  const pending = useMutationState({
    filters: { mutationKey: keys.createCard(board.id), status: "pending" },
    select: (mutation) => mutation.state.variables as string,
  });
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
          <CardTile key={cardId} board={board} cardId={cardId} onMove={onMove} />
        ))}
        {column === "todo" && pending.map((title, index) => <div key={index} className="card ghost">{title}</div>)}
      </div>
    </div>
  );
});

/** A card. Only re-renders when its own card object changes (moves elsewhere keep it identical). */
const CardTile = observer(function CardTile({ board, cardId, onMove }: { board: BoardModel; cardId: string; onMove: MoveCard }) {
  const { location, queryClient, queries } = useApp();
  const card = board.card(cardId);
  if (!card) return null;
  const index = COLUMNS.indexOf(card.column);
  const previous = COLUMNS[index - 1];
  const next = COLUMNS[index + 1];
  return (
    <div
      className={cls("card", location.selectedCardId === card.id && "selected")}
      onMouseEnter={() => void queryClient.prefetchQuery(queries.comments(card.id))}
      onClick={() => location.selectCardAction(card.id)}
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
