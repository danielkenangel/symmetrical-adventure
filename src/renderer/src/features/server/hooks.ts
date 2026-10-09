import { useQuery } from "@tanstack/react-query";

import { createFeatureContext } from "../../platform/react/featureContext";
import type { Server } from "./core";

const [ServerProvider, useServer] = createFeatureContext<Server>("server");
export { ServerProvider };

export function useServerControlsQuery() {
  return useQuery(useServer().queries.controls());
}

export function useServerActions(): Server {
  return useServer();
}
