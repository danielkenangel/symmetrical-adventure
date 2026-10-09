import type { ReactNode } from "react";

import { BoardsProvider } from "../features/boards";
import { CardsProvider } from "../features/cards";
import { ChatProvider } from "../features/chat";
import { NavigationProvider } from "../features/navigation";
import type { SharedApp } from "./compose";

/**
 * Hands each shared feature's core to React, in build order. The values are handles that never
 * change, so these providers never re-render anything; components select what they need through each
 * feature's hooks. An app's own features' providers go inside these.
 */
export function SharedProviders({ app, children }: { app: SharedApp; children: ReactNode }) {
  return (
    <NavigationProvider value={app.navigation}>
      <CardsProvider value={app.cards}>
        <BoardsProvider value={app.boards}>
          <ChatProvider value={app.chat}>{children}</ChatProvider>
        </BoardsProvider>
      </CardsProvider>
    </NavigationProvider>
  );
}
