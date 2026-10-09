import { composeShared, type SharedDeps } from "@state-demo/core/app";
import { createTitle } from "@state-demo/core/features/title/core";

import { createServer } from "../features/server/core";

export interface DesktopDeps extends SharedDeps {
  setTitle: (title: string) => void;
}

/** The desktop app: every shared feature, the window title, and the fake server's knobs. Wiring only. */
export function composeDesktop(deps: DesktopDeps) {
  const shared = composeShared(deps);
  const title = createTitle({ navigation: shared.navigation, queryClient: deps.queryClient, setTitle: deps.setTitle });
  const server = createServer({ api: deps.api, queryClient: deps.queryClient });
  return { ...shared, title, server };
}

export type DesktopApp = ReturnType<typeof composeDesktop>;
