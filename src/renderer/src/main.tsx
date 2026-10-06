import "./styles.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { configure } from "mobx";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppProvider } from "./app/AppContext";
import { AppRoot } from "./app/AppRoot";
import { createQueryClient, persistCache } from "./data/queryClient";
import { Shell } from "./views/Shell";

configure({
  enforceActions: "always",
  computedRequiresReaction: import.meta.env.DEV,
  reactionRequiresObservable: import.meta.env.DEV,
});

function localStorageOrNull(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function start(): Promise<void> {
  const storage = localStorageOrNull();
  const queryClient = createQueryClient();
  // Restore the saved cache before anything subscribes, so the first paint can use it.
  if (storage) await persistCache(queryClient, storage);
  const app = new AppRoot({ api: window.api, queryClient, storage, setTitle: (title) => (document.title = title) });

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AppProvider value={app}>
          <Shell />
        </AppProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void start();
