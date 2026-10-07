import { app, BrowserWindow, ipcMain } from "electron";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CardChanged } from "../shared/api";
import { FakeServer } from "./fakeServer";
import { runSmoke } from "./smoke";

const smoke = process.env.SMOKE === "1";
// Smoke runs get their own profile, so they never share storage (or its lock) with a real session.
if (smoke) app.setPath("userData", join(tmpdir(), "state-demo-smoke"));

function registerServer(server: FakeServer): void {
  ipcMain.handle("boards.list", () => server.listBoards());
  ipcMain.handle("board.get", (_event, boardId: string) => server.getBoard(boardId));
  ipcMain.handle("card.comments", (_event, cardId: string) => server.getComments(cardId));
  ipcMain.handle("card.move", (_event, input) => server.moveCard(input));
  ipcMain.handle("card.create", (_event, input) => server.createCard(input));
  ipcMain.handle("board.setWipLimit", (_event, input) => server.setWipLimit(input));
  ipcMain.handle("server.controls", () => server.getControls());
  ipcMain.handle("server.setControls", (_event, patch) => server.setControls(patch));
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1240,
    height: 800,
    show: !smoke,
    backgroundColor: "#f6f7f9",
    webPreferences: { preload: join(__dirname, "../preload/index.js"), contextIsolation: true, sandbox: false },
  });
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void window.loadFile(join(__dirname, "../renderer/index.html"));
  return window;
}

void app.whenReady().then(() => {
  let window: BrowserWindow | null = null;
  const server = new FakeServer((change: CardChanged) => window?.webContents.send("card.changed", change));
  registerServer(server);
  window = createWindow();
  if (smoke) runSmoke(window);
  app.on("window-all-closed", () => {
    server.dispose();
    app.quit();
  });
});
