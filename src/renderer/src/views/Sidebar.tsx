import { observer } from "mobx-react-lite";

import type { BoardSummary } from "../../../shared/api";
import { useApp } from "../app/AppContext";
import { Badge, cls, SkeletonLines } from "../ui/primitives";

export const Sidebar = observer(function Sidebar() {
  const { session, location } = useApp();
  const boards = session.boards.data;
  return (
    <nav className="sidebar">
      <div className="sidebar-label">Boards</div>
      {boards === undefined ? <SkeletonLines lines={3} /> : boards.map((summary) => <BoardLink key={summary.id} summary={summary} />)}
      <div className="sidebar-spacer" />
      <button
        type="button"
        className={cls("nav-item", location.view === "settings" && "active")}
        onClick={() => location.showSettingsAction()}
      >
        Settings
      </button>
    </nav>
  );
});

/**
 * A board entry with its TODO count. Reading the count subscribes to that board's query, so
 * every board in the sidebar stays live even while another board or Settings is on screen.
 */
const BoardLink = observer(function BoardLink({ summary }: { summary: BoardSummary }) {
  const { session, location } = useApp();
  const board = session.board(summary.id);
  const active = location.view === "board" && session.currentBoard === board;
  return (
    <button type="button" className={cls("nav-item", active && "active")} onClick={() => location.showBoardAction(summary.id)}>
      <span>{summary.name}</span>
      <Badge count={board.todoCount} pending={board.isLoading} />
    </button>
  );
});
