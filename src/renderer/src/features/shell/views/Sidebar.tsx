import { observer } from "mobx-react-lite";

import type { BoardSummary } from "../../../../../shared/api";
import { Badge, cls, SkeletonLines } from "../../../platform/ui/primitives";
import { useBoards } from "../../boards";
import { useNavigation } from "../../navigation";
import { useShell } from "../shell";

export const Sidebar = observer(function Sidebar() {
  const { location } = useNavigation();
  const boards = useBoards().list.data;
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
  const { location } = useNavigation();
  const board = useBoards().model(summary.id);
  const shell = useShell();
  const active = location.view === "board" && shell.model.currentBoard === board;
  return (
    <button type="button" className={cls("nav-item", active && "active")} onClick={() => location.showBoardAction(summary.id)}>
      <span>{summary.name}</span>
      <Badge count={board.todoCount} pending={board.isLoading} />
    </button>
  );
});
