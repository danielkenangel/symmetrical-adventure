// With ../core/defineStore.ts, the only files allowed to import zustand.
import { shallow } from "zustand/shallow";
import { useStoreWithEqualityFn } from "zustand/traditional";
import type { StoreApi } from "zustand/vanilla";

import { STORE, type Selector } from "../core/defineStore";

/**
 * Hooks over a defined store, which `useStore` finds (a feature's context, a room's context):
 *
 *   function useBoardsStore() { return useBoards().store; }
 *   const select = selectFrom(useBoardsStore);
 *   export const useBoardFilter = select((s, boardId: string) => s.filters[boardId] ?? "");
 *
 * Always compared shallowly, so selectors may return primitives, stored references, or flat picks
 * ({ a: s.a, b: s.b }). Do not build nested objects in a selector.
 */
export function selectFrom<S extends object>(useStore: () => { readonly [STORE]: StoreApi<S> }) {
  return function select<Args extends unknown[], T>(selector: Selector<S, Args, T>) {
    return function useSelected(...args: Args): T {
      return useStoreWithEqualityFn(useStore()[STORE], (state) => selector(state, ...args), shallow);
    };
  };
}
