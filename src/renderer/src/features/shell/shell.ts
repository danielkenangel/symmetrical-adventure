import { reaction } from "mobx";

import { createFeatureContext } from "../../platform/react";
import { ShellModel, type ShellModelDeps } from "./ShellModel";

export interface ShellDeps extends ShellModelDeps {
  setTitle: (title: string) => void;
}

export interface Shell {
  readonly model: ShellModel;
  /** Keeps the window title on the current board and its Todo count. */
  start(): () => void;
}

export function createShell(deps: ShellDeps): Shell {
  const model = new ShellModel(deps);
  return {
    model,
    start: () =>
      reaction(
        () => [model.currentBoard?.name, model.currentBoard?.todoCount] as const,
        ([name, todo]) => deps.setTitle(name ? `${name} (${todo} to do)` : "State demo"),
        { fireImmediately: true, equals: (a, b) => a[0] === b[0] && a[1] === b[1] },
      ),
  };
}

export const [ShellProvider, useShell] = createFeatureContext<Shell>("shell");
