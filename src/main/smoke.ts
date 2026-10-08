import { app, type BrowserWindow } from "electron";

/**
 * `pnpm smoke`: loads the built app hidden, reports whether the first paint already had a board
 * (true on a second run, from the persisted cache), prints the rendered text and any renderer
 * warnings, then runs a few interactions. Each request batch is logged by the main process, so
 * the log shows what each interaction fetched: a move should fetch only its write and one refetch.
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
    console.log(`[smoke] rendered:\n${await contents.executeJavaScript("document.querySelector('.main').innerText")}`);
    const step = async (label: string, script: string) => {
      console.log(`[step] ${label}`);
      await contents.executeJavaScript(script);
      await new Promise((resolve) => setTimeout(resolve, 600));
    };
    const moveRight = "document.querySelector('[aria-label=\"Move right\"]:not([disabled])').click()";
    const type = (selector: string, value: string) =>
      `(() => { const input = document.querySelector('${selector}'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '${value}'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`;
    await step("move a card", moveRight);
    await step("move another", moveRight);
    await step("filter", type(".filter", "a"));
    await step("move while filtering", moveRight);
    await step("clear the filter", type(".filter", ""));
    await step("open a card", "document.querySelector('.card:not(.ghost)').click()");
    console.log(`[smoke] detail: ${await contents.executeJavaScript("document.querySelector('.detail')?.innerText.replace(/\\n/g, ' | ')")}`);
    const panel = "({ chat: Boolean(document.querySelector('.chat-log')), detail: Boolean(document.querySelector('.detail')) })";
    await step("open the chat", "document.querySelector('[aria-pressed]').click()");
    console.log(`[smoke] right panel: ${JSON.stringify(await contents.executeJavaScript(panel))}`);
    await step("close the chat", "document.querySelector('[aria-pressed]').click()");
    console.log(`[smoke] right panel: ${JSON.stringify(await contents.executeJavaScript(panel))}`);
    await step("open the chat, then click a card", "document.querySelector('[aria-pressed]').click(); document.querySelector('.card:not(.ghost)').click()");
    console.log(`[smoke] right panel: ${JSON.stringify(await contents.executeJavaScript(panel))}`);
    await step("close the card", "document.querySelector('[aria-label=Close]').click()");
    console.log(`[smoke] right panel: ${JSON.stringify(await contents.executeJavaScript(panel))}`);
    await step("add a card", `${type(".new-card input", "Smoke card")}; document.querySelector('.new-card').requestSubmit()`);
    console.log(`[smoke] added: ${await contents.executeJavaScript("document.body.innerText.includes('Smoke card')")}`);
    // The cache persister writes at most once a second; let it land so the next run can restore.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    app.quit();
  });
}

