import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

import type { Api, CardChanged, ChatEvent } from "@state-demo/api";

import type { BatchCall, BatchResult } from "../shared/batch";

interface Queued {
  call: BatchCall;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

let queue: Queued[] = [];

/**
 * The transport. Like tRPC's httpBatchLink: every call made in the same tick is sent as one IPC
 * message and unpacked on return, so the renderer can ask for data per entity without paying a
 * round trip per entity.
 */
function call<T>(method: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    if (queue.length === 0) setTimeout(flush);
    queue.push({ call: { method, args }, resolve: resolve as (value: unknown) => void, reject });
  });
}

async function flush(): Promise<void> {
  const batch = queue;
  queue = [];
  try {
    const results: BatchResult[] = await ipcRenderer.invoke(
      "batch",
      batch.map(({ call }) => call),
    );
    results.forEach((result, index) => {
      const { resolve, reject } = batch[index]!;
      if (result.ok) resolve(result.value);
      else reject(new Error(result.error));
    });
  } catch (error) {
    for (const { reject } of batch) reject(error instanceof Error ? error : new Error(String(error)));
  }
}

const api: Api = {
  listBoards: () => call("boards.list"),
  getBoard: (boardId) => call("board.get", boardId),
  getCard: (cardId) => call("card.get", cardId),
  getComments: (cardId) => call("card.comments", cardId),
  moveCard: (input) => call("card.move", input),
  createCard: (input) => call("card.create", input),
  setWipLimit: (input) => call("board.setWipLimit", input),
  getControls: () => call("server.controls"),
  setControls: (patch) => call("server.setControls", patch),
  onCardChanged: (listener) => {
    const handler = (_event: IpcRendererEvent, change: CardChanged) => listener(change);
    ipcRenderer.on("card.changed", handler);
    return () => ipcRenderer.removeListener("card.changed", handler);
  },
  watchChat: (boardId, listener) => {
    const handler = (_event: IpcRendererEvent, from: string, event: ChatEvent) => {
      if (from === boardId) listener(event);
    };
    ipcRenderer.on("chat.event", handler);
    ipcRenderer.send("chat.watch", boardId);
    return () => {
      ipcRenderer.send("chat.unwatch", boardId);
      ipcRenderer.removeListener("chat.event", handler);
    };
  },
};

contextBridge.exposeInMainWorld("api", api);
