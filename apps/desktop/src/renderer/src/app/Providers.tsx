import type { ReactNode } from "react";

import { SharedProviders } from "@state-demo/core/app";

import { ServerProvider } from "../features/server";
import type { DesktopApp } from "./compose";

/** The shared features' providers, then the desktop's own, in build order. */
export function DesktopProviders({ app, children }: { app: DesktopApp; children: ReactNode }) {
  return (
    <SharedProviders app={app}>
      <ServerProvider value={app.server}>{children}</ServerProvider>
    </SharedProviders>
  );
}
