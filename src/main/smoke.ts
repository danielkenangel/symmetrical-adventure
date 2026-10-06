import { app, type BrowserWindow } from "electron";

/**
 * `pnpm smoke`: loads the built app hidden, reports whether the first paint already had a board
 * (true on a second run, from the persisted cache), prints the rendered text and any renderer
 * warnings, then quits.
 */
export function runSmoke(window: BrowserWindow): void {
  const contents = window.webContents;
  contents.on("console-message", (event) => {
    if (event.level === "warning" || event.level === "error") console.log(`[renderer ${event.level}] ${event.message}`);
  });
  contents.once("did-finish-load", async () => {
    const hasColumns = "Boolean(document.querySelector('[data-testid=column]'))";
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log(`[smoke] board on first paint: ${await contents.executeJavaScript(hasColumns)}`);
    for (let tries = 0; tries < 50 && !(await contents.executeJavaScript(hasColumns)); tries++) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    console.log(`[smoke] rendered:\n${await contents.executeJavaScript("document.body.innerText")}`);
    // The cache persister writes at most once a second; let it land so the next run can restore.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    app.quit();
  });
}
