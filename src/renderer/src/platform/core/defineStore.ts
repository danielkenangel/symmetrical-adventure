// With ../react/select.ts, the only files allowed to import zustand. No React here: hooks are made in
// ../react/select.ts.
import { devtools } from "zustand/middleware";
import { createStore, type StoreApi } from "zustand/vanilla";
import { shallow } from "zustand/vanilla/shallow";

/** Actions write; they never return data. Reads are selectors or readers. */
type WriteFn = (...args: never[]) => void | Promise<void>;
export type Actions = Record<string, WriteFn>;

export type Selector<S, Args extends unknown[], T> = (state: S, ...args: Args) => T;

/** `label` is required so async actions stay correctly named after an await. */
export type Assign<S> = (label: string, next: Partial<S> | ((state: S) => Partial<S>)) => void;

export interface StoreDefinition<S extends object, A extends Actions> {
  /** Shown in Redux DevTools; also prefixes action labels. */
  name: string;
  initialState: S;
  /** `get` is for conditional writes only; anything that returns data belongs in `read` or a hook. */
  actions: (set: Assign<S>, get: () => S) => A;
  /** Opt out on hot paths: DevTools serializes state on every write while connected. Default: on in dev. */
  devtools?: boolean;
}

/** The zustand store behind a defined store; only ../react/select.ts reads it. */
export const STORE = Symbol("store");

export interface DefinedStore<S extends object, A extends Actions> {
  /** Make a plain (non-hook) reader over the current state, for non-React code. */
  read: <Args extends unknown[], T>(selector: Selector<S, Args, T>) => (...args: Args) => T;
  /**
   * Calls `listener` when the selection changes, compared shallowly, so a selector may return a
   * tuple or a flat pick. Returns the unsubscribe.
   */
  watch: <T>(selector: (state: S) => T, listener: (next: T, previous: T) => void, options?: { fireImmediately?: boolean }) => () => void;
  /** Stable reference; safe to destructure anywhere, in or out of React. */
  actions: A;
  getState: () => S;
  subscribe: StoreApi<S>["subscribe"];
  reset: () => void;
  readonly [STORE]: StoreApi<S>;
}

/**
 * A store whose state changes only through its named actions. Called in a feature's factory, so each
 * composed app has its own instance; hooks over it come from `selectFrom` (../react/select.ts).
 */
export function defineStore<S extends object, A extends Actions>(def: StoreDefinition<S, A>): DefinedStore<S, A> {
  const store = createStore<S>()(devtools(() => def.initialState, { name: def.name, enabled: def.devtools ?? import.meta.env.DEV }));
  const set: Assign<S> = (label, next) => store.setState(next, false, `${def.name}/${label}`);

  return {
    read:
      (selector) =>
      (...args) =>
        selector(store.getState(), ...args),
    watch: (selector, listener, options) => {
      let previous = selector(store.getState());
      if (options?.fireImmediately) listener(previous, previous);
      return store.subscribe((state) => {
        const next = selector(state);
        if (shallow(next, previous)) return;
        const last = previous;
        previous = next;
        listener(next, last);
      });
    },
    actions: def.actions(set, store.getState),
    getState: store.getState,
    subscribe: store.subscribe,
    reset: () => store.setState(def.initialState, true, `${def.name}/reset`),
    [STORE]: store,
  };
}
