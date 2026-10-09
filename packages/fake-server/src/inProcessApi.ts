import type { Api, CardChanged, ChatEvent } from "@state-demo/api";

import { FakeChat } from "./fakeChat";
import { FakeServer } from "./fakeServer";

/**
 * The fake server running in the app's own JS thread, behind the same Api the desktop gets over IPC.
 * Web and mobile use it as their mock data source.
 */
export function createInProcessApi(): Api & { dispose(): void } {
  const cardListeners = new Set<(change: CardChanged) => void>();
  const chatListeners = new Map<string, Set<(event: ChatEvent) => void>>();
  const chat = new FakeChat((boardId, event) => chatListeners.get(boardId)?.forEach((listener) => listener(event)), 0);
  const server = new FakeServer(
    (change) => cardListeners.forEach((listener) => listener(change)),
    (controls) => chat.setRate(controls.chatRate),
  );
  void server.getControls().then((controls) => chat.setRate(controls.chatRate));

  return {
    listBoards: () => server.listBoards(),
    getBoard: (boardId) => server.getBoard(boardId),
    getCard: (cardId) => server.getCard(cardId),
    getComments: (cardId) => server.getComments(cardId),
    moveCard: (input) => server.moveCard(input),
    createCard: (input) => server.createCard(input),
    setWipLimit: (input) => server.setWipLimit(input),
    getControls: () => server.getControls(),
    setControls: (patch) => server.setControls(patch),
    onCardChanged(listener) {
      cardListeners.add(listener);
      return () => cardListeners.delete(listener);
    },
    watchChat(boardId, listener) {
      let listeners = chatListeners.get(boardId);
      if (!listeners) chatListeners.set(boardId, (listeners = new Set()));
      listeners.add(listener);
      chat.watch(boardId);
      return () => {
        chat.unwatch(boardId);
        listeners.delete(listener);
      };
    },
    dispose() {
      server.dispose();
      chat.dispose();
    },
  };
}
