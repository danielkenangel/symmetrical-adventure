import type { QueryClient } from "@tanstack/query-core";

import type { Api } from "../../../shared/api";
import { createBoards } from "../features/boards/core";
import { createCards } from "../features/cards/core";
import { createChat } from "../features/chat/core";
import { createNavigation } from "../features/navigation/core";
import { createServer } from "../features/server/core";
import { createShell } from "../features/shell/core";
import { Disposer, type Lifecycle } from "../platform/core/lifecycle";

export interface AppDeps {
  api: Api;
  queryClient: QueryClient;
  storage: Storage | null;
  setTitle: (title: string) => void;
}

/**
 * The integration point: builds every feature's core, in dependency order. Wiring only: no state,
 * no lookups, no logic. Building does nothing (no fetching, no subscribing), so building every
 * core up front is free. A feature can only receive features built above it, so a dependency
 * cycle can't be written here; the allowed edges are listed in architecture.mjs and checked in CI.
 */
export function composeApp(deps: AppDeps) {
  const { api, queryClient } = deps;
  const navigation = createNavigation({ storage: deps.storage });
  const cards = createCards({ api, queryClient });
  const boards = createBoards({ api, queryClient, cards });
  const server = createServer({ api, queryClient });
  const chat = createChat({ api });
  const shell = createShell({ navigation, queryClient, setTitle: deps.setTitle });
  return { navigation, cards, boards, server, chat, shell };
}

export type ComposedApp = ReturnType<typeof composeApp>;

/** Starts every feature's always-on work. Returns one cleanup for all of it. */
export function startApp(app: ComposedApp): () => void {
  const disposer = new Disposer();
  for (const feature of Object.values(app) as Lifecycle[]) {
    if (feature.start) disposer.add(feature.start());
  }
  return () => disposer.dispose();
}
