import "./styles.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { composeApp, startApp } from "./app/compose";
import { AppProviders } from "./app/Providers";
import { Shell } from "./features/shell";
import { createQueryClient, persistCache } from "./platform/core/queryClient";

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
  const app = composeApp({ api: window.api, queryClient, storage, setTitle: (title) => (document.title = title) });
  const stop = startApp(app);
  window.addEventListener("pagehide", stop);

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AppProviders app={app}>
          <Shell />
        </AppProviders>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void start();
