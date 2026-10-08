import type { QueryClient } from "@tanstack/query-core";

import type { Api, ServerControls } from "../../../../../shared/api";
import { mutationOptions, runMutation } from "../../../platform/core/mutations";

export const serverKeys = {
  controls: () => ["server", "controls"] as const,
};

export interface ServerDeps {
  api: Api;
  queryClient: QueryClient;
}

/** The fake server's knobs, shown in Settings. */
export function createServer(deps: ServerDeps) {
  const { api, queryClient } = deps;
  const queries = {
    controls: () => ({ queryKey: serverKeys.controls(), queryFn: (): Promise<ServerControls> => api.getControls(), staleTime: 0 }),
  };
  // Optimistic, so the toggles respond instantly; the refetch on settle confirms.
  const setControlsOptions = mutationOptions({
    mutationFn: (patch: Partial<ServerControls>) => api.setControls(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: serverKeys.controls() });
      queryClient.setQueryData<ServerControls>(serverKeys.controls(), (controls) => controls && { ...controls, ...patch });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: serverKeys.controls() }),
  });

  return {
    queries,
    setControls(patch: Partial<ServerControls>): Promise<void> {
      return runMutation(queryClient, setControlsOptions, patch);
    },
  };
}

export type Server = ReturnType<typeof createServer>;
