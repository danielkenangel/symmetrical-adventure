import type { QueryKey } from "@tanstack/query-core";

/**
 * What survives JSON and structural sharing: primitives, arrays, plain objects. Anything with a method
 * (Date, Map, Set, a class) maps to `never`. Structural sharing only reuses plain objects and arrays,
 * so a Date would look changed on every fetch; and persisted queries go through JSON.stringify.
 *
 * Types only: a class with no methods, or `any` from an untyped boundary, still passes.
 */
export type JsonSafe<T> = T extends string | number | boolean | null | undefined
  ? T
  : T extends (...args: never[]) => unknown
    ? never
    : T extends readonly (infer Item)[]
      ? readonly JsonSafe<Item>[]
      : { [K in keyof T]: JsonSafe<T[K]> };

type QueryData<O> = O extends { queryFn: (...args: never[]) => Promise<infer T> } ? T : never;

/**
 * A query factory's options. Every query is made with this, so its `queryFn` must return JSON-safe
 * data (see JsonSafe); a violation fails on `queryFn`.
 *
 * NOTE: a runtime check would go here if needed: in dev, subscribe to the query cache and walk each
 * successful update's data for non-plain values. That would also catch `setQueryData` writes and
 * `any` data, which the types can't.
 */
export function defineQuery<O extends { queryKey: QueryKey; queryFn: (...args: never[]) => Promise<unknown> }>(
  options: O & (QueryData<O> extends JsonSafe<QueryData<O>> ? unknown : { queryFn: "queryFn must return JSON-safe data (see JsonSafe)" }),
): O {
  return options;
}
