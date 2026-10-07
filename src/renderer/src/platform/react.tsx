import { createContext, use } from "react";

/**
 * A feature's React integration point: its provider and the hook its views use. Components ask for
 * the features they need by importing their hooks, so the import graph shows what each view uses,
 * and there's no app object to reach through.
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
