import { app, BrowserWindow, ipcMain } from "electron";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CardChanged, ChatEvent } from "@state-demo/api";
import { FakeChat, FakeServer } from "@state-demo/fake-server";

import type { BatchCall, BatchResult } from "../shared/batch";
import { runSmoke } from "./smoke";

const smoke = process.env.SMOKE === "1";
// Smoke runs get their own profile, so they never share storage (or its lock) with a real session.
if (smoke) app.setPath("userData", join(tmpdir(), "state-demo-smoke"));

function registerServer(server: FakeServer): void {
  const methods: Record<string, (...args: never[]) => Promise<unknown>> = {
    "boards.list": () => server.listBoards(),
    "board.get": (boardId: string) => server.getBoard(boardId),
    "card.get": (cardId: string) => server.getCard(cardId),
    "card.comments": (cardId: string) => server.getComments(cardId),
    "card.move": (input: Parameters<FakeServer["moveCard"]>[0]) => server.moveCard(input),
    "card.create": (input: Parameters<FakeServer["createCard"]>[0]) => server.createCard(input),
    "board.setWipLimit": (input: Parameters<FakeServer["setWipLimit"]>[0]) => server.setWipLimit(input),
    "server.controls": () => server.getControls(),
    "server.setControls": (patch: Parameters<FakeServer["setControls"]>[0]) => server.setControls(patch),
  };
  // One message per batch; each call settles on its own, so one failure doesn't fail the rest.
  ipcMain.handle("batch", (_event, calls: BatchCall[]) => {
    if (smoke) console.log(`[batch] ${calls.map(({ method }) => method).join(", ")}`);
    return Promise.all(
      calls.map(async ({ method, args }): Promise<BatchResult> => {
        try {
          const handler = methods[method] as ((...args: unknown[]) => Promise<unknown>) | undefined;
          if (!handler) throw new Error(`No method ${method}`);
          return { ok: true, value: await handler(...args) };
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
      }),
    );
  });
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
  const chat = new FakeChat((boardId: string, event: ChatEvent) => window?.webContents.send("chat.event", boardId, event), 0);
  const server = new FakeServer(
    (change: CardChanged) => window?.webContents.send("card.changed", change),
    (controls) => chat.setRate(controls.chatRate),
  );
  void server.getControls().then((controls) => chat.setRate(controls.chatRate));
  registerServer(server);
  ipcMain.on("chat.watch", (_event, boardId: string) => chat.watch(boardId));
  ipcMain.on("chat.unwatch", (_event, boardId: string) => chat.unwatch(boardId));
  window = createWindow();
  if (smoke) runSmoke(window);
  app.on("window-all-closed", () => {
    server.dispose();
    chat.dispose();
    app.quit();
  });
});
