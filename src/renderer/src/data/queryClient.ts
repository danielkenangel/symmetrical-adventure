import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

import { DAY } from "./queries";

export const CACHE_STORAGE_KEY = "state-demo:cache";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
  });
}

/**
 * Restores the saved cache, then keeps saving it. Only queries marked `meta: { persist: true }`
 * are written. Resolves once the restore is done, so the first paint can use it.
 */
export function persistCache(queryClient: QueryClient, storage: Storage): Promise<void> {
  const [, restored] = persistQueryClient({
    queryClient,
    persister: createAsyncStoragePersister({ storage, key: CACHE_STORAGE_KEY }),
    maxAge: 7 * DAY,
    buster: "1",
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => query.state.status === "success" && query.meta?.persist === true,
    },
  });
  return restored;
}
