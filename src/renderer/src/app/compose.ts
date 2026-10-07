import type { QueryClient } from "@tanstack/react-query";

import type { Api } from "../../../shared/api";
import { createBoards } from "../features/boards";
import { createCards } from "../features/cards";
import { createNavigation } from "../features/navigation";
import { createServer } from "../features/server";
import { createShell } from "../features/shell";
import { Disposer, type Startable } from "../platform/lifecycle";

export interface AppDeps {
  api: Api;
  queryClient: QueryClient;
  storage: Pick<Storage, "getItem" | "setItem"> | null;
  setTitle: (title: string) => void;
}

/**
 * The integration point: builds every feature, in dependency order. Wiring only: no state, no
 * lookups, no logic. A feature can only receive features built above it, so a dependency cycle
 * can't be written here; the allowed edges are listed in architecture.mjs and checked in CI.
 */
export function composeApp(deps: AppDeps) {
  const { api, queryClient } = deps;
  const navigation = createNavigation({ storage: deps.storage });
  const boards = createBoards({ api, queryClient });
  const cards = createCards({ api, queryClient });
  const server = createServer({ api, queryClient });
  const shell = createShell({ navigation, boards, setTitle: deps.setTitle });
  return { navigation, boards, cards, server, shell };
}

export type ComposedApp = ReturnType<typeof composeApp>;

/** Starts every feature's always-on work. Returns one cleanup for all of it. */
export function startApp(app: ComposedApp): () => void {
  const disposer = new Disposer();
  for (const feature of Object.values(app) as Startable[]) {
    if (feature.start) disposer.add(feature.start());
  }
  return () => disposer.dispose();
}
