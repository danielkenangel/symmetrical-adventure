import { useBoardListQuery, useCurrentBoardIdQuery, useOpenCardIdQuery } from "@state-demo/core/features/boards";
import { useChatOpen, useView } from "@state-demo/core/features/navigation";
import { BoardView, SelectedCard } from "@state-demo/ui-dom/features/boards";
import { ChatPanel } from "@state-demo/ui-dom/features/chat";
import { BoardSkeleton } from "@state-demo/ui-dom/ui";

import { SettingsView } from "./SettingsView";
import { Sidebar } from "./Sidebar";

/** The desktop layout: the sidebar, the board or the settings, and a side panel for the board. */
export function Shell() {
  const view = useView();
  const boardId = useCurrentBoardIdQuery().data;
  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        {view === "settings" ? (
          <SettingsView />
        ) : boardId ? (
          // Keyed on the board, so switching board starts each component fresh.
          <BoardView key={boardId} boardId={boardId} />
        ) : (
          <NoBoard />
        )}
      </main>
      {view === "board" && boardId && <SidePanel key={boardId} boardId={boardId} />}
    </div>
  );
}

/** One container for whatever the side panel shows: the chat, the open card, or nothing. */
function SidePanel({ boardId }: { boardId: string }) {
  const chatOpen = useChatOpen();
  const cardId = useOpenCardIdQuery(boardId).data;
  if (!chatOpen && !cardId) return null;
  return <aside className="side-panel">{chatOpen ? <ChatPanel boardId={boardId} /> : <SelectedCard boardId={boardId} />}</aside>;
}

function NoBoard() {
  const { isPending, error } = useBoardListQuery();
  if (isPending) return <BoardSkeleton />;
  if (error) return <p className="notice error">Couldn&apos;t load boards: {error.message}</p>;
  return <p className="muted">No boards yet.</p>;
}
