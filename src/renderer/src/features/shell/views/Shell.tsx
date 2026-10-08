import { BoardSkeleton } from "../../../platform/ui/primitives";
import { BoardView, SelectedCard, useBoardList, useOpenCardId } from "../../boards";
import { ChatPanel } from "../../chat";
import { useLocation } from "../../navigation";
import { useCurrentBoardId } from "../hooks";
import { SettingsView } from "./SettingsView";
import { Sidebar } from "./Sidebar";

/** The layout: the sidebar, the board or the settings, and a side panel for the board. */
export function Shell() {
  const view = useLocation((s) => s.view);
  const boardId = useCurrentBoardId();
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
  const chatOpen = useLocation((s) => s.chatOpen);
  const cardId = useOpenCardId(boardId);
  if (!chatOpen && !cardId) return null;
  return <aside className="side-panel">{chatOpen ? <ChatPanel boardId={boardId} /> : <SelectedCard boardId={boardId} />}</aside>;
}

function NoBoard() {
  const { isPending, error } = useBoardList();
  if (isPending) return <BoardSkeleton />;
  if (error) return <p className="notice error">Couldn&apos;t load boards: {error.message}</p>;
  return <p className="muted">No boards yet.</p>;
}
