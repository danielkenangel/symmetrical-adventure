import { observer } from "mobx-react-lite";
import { useCallback } from "react";

import { BoardSkeleton } from "../../../platform/ui/primitives";
import { BoardView, useBoards } from "../../boards";
import { CardDetail, useCards } from "../../cards";
import { useNavigation } from "../../navigation";
import { useShell } from "../shell";
import { SettingsView } from "./SettingsView";
import { Sidebar } from "./Sidebar";

/** The layout, and the wiring between features: selection (navigation) and prefetch (cards) reach the board as props. */
export const Shell = observer(function Shell() {
  const { location } = useNavigation();
  const boards = useBoards();
  const cards = useCards();
  const board = useShell().model.currentBoard;
  const onSelectCard = useCallback((cardId: string) => location.selectCardAction(cardId), [location]);
  const onCloseCard = useCallback(() => location.selectCardAction(null), [location]);
  const cardId = location.view === "board" ? location.selectedCardId : null;
  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        {location.view === "settings" ? (
          <SettingsView />
        ) : board ? (
          // Keyed on the model, so switching board remounts the view.
          <BoardView key={board.id} board={board} selectedCardId={location.selectedCardId} onSelectCard={onSelectCard} onCardHover={cards.prefetch} />
        ) : boards.list.isPending ? (
          <BoardSkeleton />
        ) : boards.list.error ? (
          <p className="notice error">Couldn&apos;t load boards: {boards.list.error.message}</p>
        ) : (
          <p className="muted">No boards yet.</p>
        )}
      </main>
      {board && cardId && <CardDetail key={cardId} board={board} cardId={cardId} onClose={onCloseCard} />}
    </div>
  );
});
