import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

import type { Api, CardChanged } from "../shared/api";

const api: Api = {
  listBoards: () => ipcRenderer.invoke("boards.list"),
  getBoard: (boardId) => ipcRenderer.invoke("board.get", boardId),
  getComments: (cardId) => ipcRenderer.invoke("card.comments", cardId),
  moveCard: (input) => ipcRenderer.invoke("card.move", input),
  createCard: (input) => ipcRenderer.invoke("card.create", input),
  setWipLimit: (input) => ipcRenderer.invoke("board.setWipLimit", input),
  getControls: () => ipcRenderer.invoke("server.controls"),
  setControls: (patch) => ipcRenderer.invoke("server.setControls", patch),
  onCardChanged: (listener) => {
    const handler = (_event: IpcRendererEvent, change: CardChanged) => listener(change);
    ipcRenderer.on("card.changed", handler);
    return () => ipcRenderer.removeListener("card.changed", handler);
  },
};

contextBridge.exposeInMainWorld("api", api);
