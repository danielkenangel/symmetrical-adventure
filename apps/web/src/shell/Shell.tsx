import { memo } from "react";

import { useBoardListQuery, useCurrentBoardIdQuery, useOpenCardIdQuery } from "@state-demo/core/features/boards";
import { useChatOpen, useNavigationActions } from "@state-demo/core/features/navigation";
import { BoardView, SelectedCard } from "@state-demo/ui-dom/features/boards";
import { ChatPanel } from "@state-demo/ui-dom/features/chat";
import { BoardSkeleton, cls } from "@state-demo/ui-dom/ui";

/**
 * The web layout: board tabs across the top, the board, and its side panel. The same views as
 * desktop, placed differently, and no Settings.
 */
export function Shell() {
  const boardId = useCurrentBoardIdQuery().data;
  return (
    <div className="web-shell">
      <BoardTabs />
      <div className="web-body">
        <main className="main">{boardId ? <BoardView key={boardId} boardId={boardId} /> : <BoardSkeleton />}</main>
        {boardId && <SidePanel key={boardId} boardId={boardId} />}
      </div>
    </div>
  );
}

function BoardTabs() {
  const boards = useBoardListQuery().data ?? [];
  return (
    <nav className="web-tabs">
      <strong>State demo</strong>
      {boards.map(({ id, name }) => (
        <BoardTab key={id} boardId={id} name={name} />
      ))}
    </nav>
  );
}

const BoardTab = memo(function BoardTab({ boardId, name }: { boardId: string; name: string }) {
  const active = useCurrentBoardIdQuery().data === boardId;
  const { showBoard } = useNavigationActions();
  return (
    <button type="button" className={cls("nav-item", active && "active")} onClick={() => showBoard(boardId)}>
      {name}
    </button>
  );
});

function SidePanel({ boardId }: { boardId: string }) {
  const chatOpen = useChatOpen();
  const cardId = useOpenCardIdQuery(boardId).data;
  if (!chatOpen && !cardId) return null;
  return <aside className="side-panel">{chatOpen ? <ChatPanel boardId={boardId} /> : <SelectedCard boardId={boardId} />}</aside>;
}
