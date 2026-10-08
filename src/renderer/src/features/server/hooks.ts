import { useQuery } from "@tanstack/react-query";

import { createFeatureContext } from "../../platform/react/featureContext";
import type { Server } from "./core";

const [ServerProvider, useServer] = createFeatureContext<Server>("server");
export { ServerProvider };

export function useServerControls() {
  return useQuery(useServer().queries.controls()).data;
}

export function useServerActions(): Server {
  return useServer();
}
