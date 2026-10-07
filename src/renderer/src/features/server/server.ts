import { useMutation, type QueryClient } from "@tanstack/react-query";

import { createFeatureContext } from "../../platform/react";
import { createServerQueries, setControlsOptions, type ServerApi } from "./queries";
import { ServerModel } from "./ServerModel";

export interface ServerDeps {
  api: ServerApi;
  queryClient: QueryClient;
}

export interface Server {
  readonly model: ServerModel;
  readonly setControls: () => ReturnType<typeof setControlsOptions>;
}

export function createServer(deps: ServerDeps): Server {
  return {
    model: new ServerModel({ queryClient: deps.queryClient, queries: createServerQueries(deps.api) }),
    setControls: () => setControlsOptions(deps),
  };
}

export const [ServerProvider, useServer] = createFeatureContext<Server>("server");

export function useSetControls() {
  return useMutation(useServer().setControls());
}
