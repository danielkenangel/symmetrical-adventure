// `pnpm smoke:web` / `pnpm smoke:mobile-web`: serves a built web bundle, opens it in Chrome, prints
// what rendered and any console warnings or errors, then runs a few interactions. Selectors are by
// role and text, so the same steps drive the DOM views (web) and the React Native views (mobile, on
// react-native-web).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright-core";

const target = process.argv[2];
const root = resolve(import.meta.dirname, "..", { web: "apps/web/dist", mobile: "apps/mobile/dist" }[target] ?? "");
if (!target || root.endsWith("..")) throw new Error("Usage: smoke-web.mjs web|mobile");

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".ttf": "font/ttf" };
const server = createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url, "http://x").pathname);
  const file = join(root, path.endsWith("/") ? `${path}index.html` : path);
  // An unknown path gets the app, like a single-page app's host.
  const body = await readFile(file).catch(() => null);
  if (body) response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(body);
  else response.writeHead(200, { "content-type": "text/html" }).end(await readFile(join(root, "index.html")));
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: target === "mobile" ? { width: 390, height: 844 } : { width: 1240, height: 800 } });
page.on("console", (message) => {
  if (message.type() === "warning" || message.type() === "error") console.log(`[console ${message.type()}] ${message.text()}`);
});
page.on("pageerror", (error) => console.log(`[page error] ${error.message}`));

const step = async (label, action) => {
  console.log(`[step] ${label}`);
  await action();
  await page.waitForTimeout(700);
};
const text = async () => (await page.locator("body").innerText()).replace(/\n+/g, " | ");

try {
  await page.goto(url);
  await page.getByText("Write release notes").waitFor({ timeout: 15000 });
  console.log(`[smoke] rendered: ${await text()}`);
  await step("move a card right", () => page.getByRole("button", { name: "Move right" }).first().click());
  await step("switch board", () => page.getByRole("button", { name: /^Bugs/ }).first().click());
  console.log(`[smoke] bugs board: ${(await text()).includes("Crash on resume")}`);
  await step("open a card", () => page.getByText("Crash on resume").click());
  console.log(`[smoke] card detail shows comments: ${(await text()).match(/comments/i) !== null}`);
  await step("close the card", () => page.getByRole("button", { name: "Close" }).click());
  await step("open the chat", () => page.getByRole("button", { name: "Board chat" }).first().click());
  await page.waitForTimeout(1000);
  console.log(`[smoke] chat: ${(await text()).match(/(\d+) events/)?.[0] ?? "no event count"}`);
  await step("close the chat", () =>
    page
      .getByRole("button", { name: /Board chat|Close/ })
      .first()
      .click(),
  );
  await step("add a card", async () => {
    await page.getByLabel("New card title").fill("Smoke card");
    await page.getByRole("button", { name: "Add", exact: true }).click();
  });
  await page.getByText("Smoke card").first().waitFor({ timeout: 5000 });
  console.log("[smoke] added: true");
  await page.screenshot({ path: join(import.meta.dirname, `../out/smoke-${target}.png`) });
} finally {
  await browser.close();
  server.close();
}
