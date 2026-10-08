import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/query-core";
import { persistQueryClient } from "@tanstack/query-persist-client-core";

export const DAY = 24 * 60 * 60_000;
export const CACHE_STORAGE_KEY = "state-demo:cache";

/** Spread into a query factory: saved to disk, for data a restored screen needs on its first paint. */
export const persisted = { meta: { persist: true }, gcTime: 7 * DAY } as const;

export function createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } });
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
    buster: "4",
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => query.state.status === "success" && query.meta?.persist === true,
    },
    // Restored entries are built from defaults, not from the query factories, so they'd get the
    // default 5-minute gcTime: unread for 5 minutes, they'd be dropped, and the persister would
    // then delete them from disk too.
    hydrateOptions: { defaultOptions: { queries: { gcTime: 7 * DAY } } },
  });
  return restored;
}
