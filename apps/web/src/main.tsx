import "@state-demo/ui-dom/styles.css";
import "./web.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { createQueryClient, persistCache, SharedProviders, startApp } from "@state-demo/core/app";
import { createInProcessApi } from "@state-demo/fake-server";

import { composeWeb } from "./app/compose";
import { Shell } from "./shell/Shell";

function localStorageOrNull(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function start(): Promise<void> {
  Object.assign(globalThis, { __DEV__: import.meta.env.DEV });
  const storage = localStorageOrNull();
  const queryClient = createQueryClient();
  if (storage) await persistCache(queryClient, storage);
  const api = createInProcessApi();
  const app = composeWeb({ api, queryClient, storage, setTitle: (title) => (document.title = title) });
  const stop = startApp(app);
  window.addEventListener("pagehide", () => {
    stop();
    api.dispose();
  });

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <SharedProviders app={app}>
          <Shell />
        </SharedProviders>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void start();
