import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query";

import type { Api, ServerControls } from "../../../../shared/api";

export const serverKeys = {
  controls: () => ["server", "controls"] as const,
};

export type ServerApi = Pick<Api, "getControls" | "setControls">;

export function createServerQueries(api: ServerApi) {
  return {
    controls: () => queryOptions({ queryKey: serverKeys.controls(), queryFn: () => api.getControls(), staleTime: 0 }),
  };
}

export type ServerQueries = ReturnType<typeof createServerQueries>;

/** Optimistic, so the toggles respond instantly; the refetch on settle confirms. */
export function setControlsOptions({ api, queryClient }: { api: ServerApi; queryClient: QueryClient }) {
  return mutationOptions({
    mutationFn: (patch: Partial<ServerControls>) => api.setControls(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: serverKeys.controls() });
      queryClient.setQueryData<ServerControls>(serverKeys.controls(), (controls) => controls && { ...controls, ...patch });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: serverKeys.controls() }),
  });
}
