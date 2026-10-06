import { observer } from "mobx-react-lite";

import { useApp } from "../app/AppContext";
import { BoardView } from "./BoardView";
import { CardDetail } from "./CardDetail";
import { SettingsView } from "./SettingsView";
import { Sidebar } from "./Sidebar";

export const Shell = observer(function Shell() {
  const { location, session } = useApp();
  const board = session.currentBoard;
  const cardId = location.view === "board" ? location.selectedCardId : null;
  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        {location.view === "settings" ? (
          <SettingsView />
        ) : board ? (
          // Keyed on the model, so switching board remounts the view.
          <BoardView key={board.id} board={board} />
        ) : null}
      </main>
      {board && cardId && <CardDetail key={cardId} board={board} cardId={cardId} />}
    </div>
  );
});
