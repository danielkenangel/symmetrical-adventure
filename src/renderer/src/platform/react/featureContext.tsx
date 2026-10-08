import { createContext, use } from "react";

/**
 * A feature's React handle: a provider for the app, and a hook for the feature's own hooks. The
 * context holds the feature's core (stores, queries, writes), which never changes, so reading it
 * never re-renders anything. Data is selected from it in the leaf that needs it.
 *
 * Keep the hook private to the feature: other features read through the feature's exported hooks.
 */
export function createFeatureContext<T>(name: string) {
  const Context = createContext<T | null>(null);
  function useFeature(): T {
    const value = use(Context);
    if (!value) throw new Error(`The ${name} feature isn't provided. Add it to the app's providers.`);
    return value;
  }
  return [Context.Provider, useFeature] as const;
}
