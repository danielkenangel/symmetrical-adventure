import { memo } from "react";

import { Badge, cls, SkeletonLines } from "../../../platform/ui/primitives";
import { useBoardListQuery, useTodoCountQuery } from "../../boards";
import { useIsView, useNavigationActions } from "../../navigation";
import { useCurrentBoardIdQuery } from "../hooks";

export function Sidebar() {
  const boards = useBoardListQuery().data;
  const settings = useIsView("settings");
  const { showSettings } = useNavigationActions();
  return (
    <nav className="sidebar">
      <div className="sidebar-label">Boards</div>
      {boards === undefined ? <SkeletonLines lines={3} /> : boards.map(({ id, name }) => <BoardLink key={id} boardId={id} name={name} />)}
      <div className="sidebar-spacer" />
      <button type="button" className={cls("nav-item", settings && "active")} onClick={showSettings}>
        Settings
      </button>
    </nav>
  );
}

/**
 * A board entry with its Todo count. Reading the count loads that board, so every board in the
 * sidebar stays live even while another board or Settings is on screen. A list row, so memo.
 */
const BoardLink = memo(function BoardLink({ boardId, name }: { boardId: string; name: string }) {
  const { data: count, isPending } = useTodoCountQuery(boardId);
  const onBoardView = useIsView("board");
  const current = useCurrentBoardIdQuery().data;
  const active = onBoardView && current === boardId;
  const { showBoard } = useNavigationActions();
  return (
    <button type="button" className={cls("nav-item", active && "active")} onClick={() => showBoard(boardId)}>
      <span>{name}</span>
      <Badge count={count ?? 0} pending={isPending} />
    </button>
  );
});
