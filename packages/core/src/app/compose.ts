import type { QueryClient } from "@tanstack/query-core";

import type { Api } from "@state-demo/api";
import { createBoards } from "../features/boards/core";
import { createCards } from "../features/cards/core";
import { createChat } from "../features/chat/core";
import { createNavigation } from "../features/navigation/core";
import { Disposer, type Lifecycle } from "../platform/core/lifecycle";
import type { KeyValueStorage } from "../platform/core/storage";

/** What the shared features need from the app that runs them. Each app builds one in its entry point. */
export interface SharedDeps {
  api: Api;
  queryClient: QueryClient;
  /** Null where there's no synchronous storage: nothing is restored or saved. */
  storage: KeyValueStorage | null;
}

/**
 * Builds the features every app has, in dependency order. Wiring only: no state, no lookups, no
 * logic. Building does nothing (no fetching, no subscribing), so building every core up front is
 * free. Each app's own compose builds its extra features on top, from these.
 */
export function composeShared(deps: SharedDeps) {
  const { api, queryClient } = deps;
  const navigation = createNavigation({ storage: deps.storage });
  const cards = createCards({ api, queryClient });
  const boards = createBoards({ api, queryClient, cards });
  const chat = createChat({ api });
  return { navigation, cards, boards, chat };
}

export type SharedApp = ReturnType<typeof composeShared>;

/** Starts every feature's always-on work. Returns one cleanup for all of it. */
export function startApp(app: object): () => void {
  const disposer = new Disposer();
  for (const feature of Object.values(app) as Lifecycle[]) {
    if (feature.start) disposer.add(feature.start());
  }
  return () => disposer.dispose();
}
