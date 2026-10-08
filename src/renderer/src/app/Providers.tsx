import type { ReactNode } from "react";

import { BoardsProvider } from "../features/boards";
import { CardsProvider } from "../features/cards";
import { ChatProvider } from "../features/chat";
import { NavigationProvider } from "../features/navigation";
import { ServerProvider } from "../features/server";
import type { ComposedApp } from "./compose";

/**
 * Hands each feature's core to React, in build order. The values are handles that never change, so
 * these providers never re-render anything; components select what they need through each
 * feature's hooks.
 */
export function AppProviders({ app, children }: { app: ComposedApp; children: ReactNode }) {
  return (
    <NavigationProvider value={app.navigation}>
      <CardsProvider value={app.cards}>
        <BoardsProvider value={app.boards}>
          <ServerProvider value={app.server}>
            <ChatProvider value={app.chat}>{children}</ChatProvider>
          </ServerProvider>
        </BoardsProvider>
      </CardsProvider>
    </NavigationProvider>
  );
}
