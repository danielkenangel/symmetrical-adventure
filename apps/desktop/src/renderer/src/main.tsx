import "@state-demo/ui-dom/styles.css";
import "./shell/shell.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { createQueryClient, persistCache, startApp } from "@state-demo/core/app";

import { composeDesktop } from "./app/compose";
import { DesktopProviders } from "./app/Providers";
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
  // Restore the saved cache before anything subscribes, so the first paint can use it.
  if (storage) await persistCache(queryClient, storage);
  const app = composeDesktop({ api: window.api, queryClient, storage, setTitle: (title) => (document.title = title) });
  const stop = startApp(app);
  window.addEventListener("pagehide", stop);

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <DesktopProviders app={app}>
          <Shell />
        </DesktopProviders>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void start();
