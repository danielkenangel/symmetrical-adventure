import type { ReactNode } from "react";

import { BoardsProvider } from "../features/boards";
import { CardsProvider } from "../features/cards";
import { NavigationProvider } from "../features/navigation";
import { ServerProvider } from "../features/server";
import { ShellProvider } from "../features/shell";
import type { ComposedApp } from "./compose";

/** Hands each feature to React. Components then ask for features one by one, never for the app. */
export function AppProviders({ app, children }: { app: ComposedApp; children: ReactNode }) {
  return (
    <NavigationProvider value={app.navigation}>
      <BoardsProvider value={app.boards}>
        <CardsProvider value={app.cards}>
          <ServerProvider value={app.server}>
            <ShellProvider value={app.shell}>{children}</ShellProvider>
          </ServerProvider>
        </CardsProvider>
      </BoardsProvider>
    </NavigationProvider>
  );
}
