import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { composeShared, createQueryClient, SharedProviders, startApp } from "@state-demo/core/app";
import { createInProcessApi } from "@state-demo/fake-server";

import { Shell } from "./shell/Shell";

// Built and started once, outside React, like the other apps. No synchronous storage yet, so
// nothing is restored on relaunch.
const queryClient = createQueryClient();
const app = composeShared({ api: createInProcessApi(), queryClient, storage: null });
startApp(app);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SharedProviders app={app}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <Shell />
        </SafeAreaProvider>
      </SharedProviders>
    </QueryClientProvider>
  );
}
