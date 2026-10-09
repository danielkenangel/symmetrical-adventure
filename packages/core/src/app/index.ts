// What an app needs to boot: the shared composition root and the platform pieces it's built from.
export { composeShared, startApp, type SharedApp, type SharedDeps } from "./compose";
export { SharedProviders } from "./Providers";
export { CACHE_STORAGE_KEY, createQueryClient, persistCache } from "../platform/core/queryClient";
