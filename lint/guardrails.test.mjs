import { ESLint } from "eslint";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const cwd = fileURLToPath(new URL("..", import.meta.url));
const eslint = new ESLint({ cwd });

/** Lints a snippet as if it lived at `path`, through the real config, and returns the rules that fired. */
async function violations(code, path) {
  const [result] = await eslint.lintText(code, { filePath: `${cwd}/${path}` });
  const fatal = result.messages.filter((message) => message.fatal);
  if (fatal.length) throw new Error(fatal.map((message) => message.message).join("\n"));
  return result.messages.map((message) => message.ruleId);
}

const MODEL = "src/renderer/src/models/Fixture.ts";

describe("MobX guardrails", () => {
  test("a reaction whose disposer is thrown away", async () => {
    const code = `import { reaction } from "mobx";\nexport function watch(read: () => number) { reaction(read, () => {}); }`;
    expect(await violations(code, MODEL)).toContain("no-restricted-syntax");
  });

  test("a reaction whose disposer is kept", async () => {
    const code = `import { reaction } from "mobx";\nexport function watch(add: (d: () => void) => void, read: () => number) { add(reaction(read, () => {})); }`;
    expect(await violations(code, MODEL)).toEqual([]);
  });

  test("an async action", async () => {
    const code = `import { action } from "mobx";\nexport class Fixture { @action async loadAction() { await Promise.resolve(); } }`;
    expect(await violations(code, MODEL)).toEqual(["no-restricted-syntax"]);
  });

  test("an action without the Action suffix", async () => {
    const code = `import { action, observable } from "mobx";\nexport class Fixture { @observable accessor n = 0; @action increment() { this.n++; } }`;
    expect(await violations(code, MODEL)).toEqual(["local/action-naming"]);
  });

  test("makeAutoObservable", async () => {
    const code = `import { makeAutoObservable } from "mobx";\nexport class Fixture { n = 0; constructor() { makeAutoObservable(this); } }`;
    expect(await violations(code, MODEL)).toEqual(["no-restricted-syntax"]);
  });

  test("a constructor that takes the whole app", async () => {
    const code = `import type { AppRoot } from "../app/AppRoot";\nexport class Fixture { constructor(private readonly app: AppRoot) {} }`;
    expect(await violations(code, MODEL)).toEqual(["local/narrow-deps"]);
  });

  test("a deps object that smuggles in the session", async () => {
    const code = `import type { Session } from "./Session";\nexport class Fixture { constructor(deps: { session: Session; id: string }) { void deps; } }`;
    expect(await violations(code, MODEL)).toEqual(["local/narrow-deps"]);
  });

  test("a connected view that isn't an observer", async () => {
    const code = `import type { BoardModel } from "../models/BoardModel";\nexport function Title({ board }: { board: BoardModel }) { return <h1>{board.name}</h1>; }`;
    expect(await violations(code, "src/renderer/src/views/Fixture.tsx")).toEqual(["mobx/missing-observer"]);
  });

  test("a ui component that imports a model", async () => {
    const code = `import type { BoardModel } from "../models/BoardModel";\nexport function Title({ board }: { board: BoardModel }) { return <h1>{board.name}</h1>; }`;
    expect(await violations(code, "src/renderer/src/ui/Fixture.tsx")).toEqual(["no-restricted-imports"]);
  });

  test("a well-formed model", async () => {
    const code = [
      `import { action, computed, observable } from "mobx";`,
      `export class Fixture {`,
      `  @observable accessor n = 0;`,
      `  constructor(private readonly deps: { step: number }) {}`,
      `  @computed get doubled() { return this.n * 2; }`,
      `  @action incrementAction() { this.n += this.deps.step; }`,
      `}`,
    ].join("\n");
    expect(await violations(code, MODEL)).toEqual([]);
  });
});
