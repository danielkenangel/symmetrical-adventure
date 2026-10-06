import type { QueryClient } from "@tanstack/react-query";
import { reaction } from "mobx";

import type { Api } from "../../../shared/api";
import { createQueries, type Queries } from "../data/queries";
import { AppLocation, parseLocation } from "../models/AppLocation";
import { Session } from "../models/Session";
import { Disposer } from "./Disposer";
import { startLiveUpdates } from "./liveUpdates";

export const LOCATION_STORAGE_KEY = "state-demo:location";

export interface AppRootDeps {
  api: Api;
  queryClient: QueryClient;
  storage: Pick<Storage, "getItem" | "setItem"> | null;
  setTitle: (title: string) => void;
}

/**
 * The composition root, and the owner of everything that must run whether or not anything on
 * screen reads it: the live-update connection and the app's few reactions. Created once, before
 * React renders.
 */
export class AppRoot {
  readonly queries: Queries;
  readonly location = new AppLocation();
  readonly session: Session;
  private readonly disposer = new Disposer();

  constructor(private readonly deps: AppRootDeps) {
    this.queries = createQueries(deps.api);
    const saved = parseLocation(deps.storage?.getItem(LOCATION_STORAGE_KEY) ?? null);
    if (saved) this.location.restoreAction(saved);
    this.session = new Session({ queryClient: deps.queryClient, queries: this.queries, location: this.location });

    this.disposer.add(startLiveUpdates({ api: deps.api, queryClient: deps.queryClient }));
    this.disposer.add(
      reaction(
        () => this.location.snapshot,
        (snapshot) => deps.storage?.setItem(LOCATION_STORAGE_KEY, JSON.stringify(snapshot)),
      ),
    );
    this.disposer.add(
      reaction(
        () => [this.session.currentBoard?.name, this.session.currentBoard?.todoCount] as const,
        ([name, todo]) => deps.setTitle(name ? `${name} (${todo} to do)` : "State demo"),
        { fireImmediately: true, equals: (a, b) => a[0] === b[0] && a[1] === b[1] },
      ),
    );
  }

  get api(): Api {
    return this.deps.api;
  }

  get queryClient(): QueryClient {
    return this.deps.queryClient;
  }

  dispose(): void {
    this.disposer.dispose();
  }
}
