import { createContext, use } from "react";

import type { AppRoot } from "./AppRoot";

const AppContext = createContext<AppRoot | null>(null);

export const AppProvider = AppContext.Provider;

export function useApp(): AppRoot {
  const app = use(AppContext);
  if (!app) throw new Error("useApp must be used inside AppProvider");
  return app;
}
