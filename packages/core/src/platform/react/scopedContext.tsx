import { createContext, use, useEffect, useState, type ReactNode } from "react";

import { defineStore, type Actions, type DefinedStore, type StoreDefinition } from "../core/defineStore";
import type { SnapshotCache } from "../core/snapshotCache";

/**
 * A store per mounted provider, seeded from a snapshot cache and saved back to it on every change,
 * so reopening a key (a thread) starts where it left off. The mounted store is authoritative; the
 * cache only holds copies, and nothing reads it while the key is mounted. Keep the hook private to
 * the feature, like `createFeatureContext`.
 *
 *   const [ThreadUiProvider, useThreadUi] = createScopedContext({ name: "thread-ui", initialState, actions });
 *   const select = selectFrom(useThreadUi);
 *   <ThreadUiProvider key={threadId} id={threadId} snapshots={threads.uiSnapshots}>…</ThreadUiProvider>
 *
 * Render it keyed by `id`: the store is made once per mount, so a new key needs a new mount. Two
 * mounts of one key have separate stores, and the cache keeps whichever saved last.
 */
export function createScopedContext<S extends object, A extends Actions>(def: StoreDefinition<S, A>) {
  const Context = createContext<DefinedStore<S, A> | null>(null);

  function Provider({ id, snapshots, children }: { id: string; snapshots: SnapshotCache<S>; children: ReactNode }) {
    // DevTools off unless asked for: a store per mount would leave a connection behind per mount.
    const [store] = useState(() =>
      defineStore({
        ...def,
        name: `${def.name}/${id}`,
        devtools: def.devtools ?? false,
        initialState: snapshots.get(id) ?? def.initialState,
      }),
    );
    useEffect(() => {
      // Saved on mount too, so a key that's opened but never changed still counts as recently used.
      snapshots.set(id, store.getState());
      return store.subscribe((state) => snapshots.set(id, state));
    }, [store, snapshots, id]);
    return <Context value={store}>{children}</Context>;
  }

  function useScoped(): DefinedStore<S, A> {
    const value = use(Context);
    if (!value) throw new Error(`No ${def.name} provider is mounted here. Render it around this component.`);
    return value;
  }

  return [Provider, useScoped] as const;
}
