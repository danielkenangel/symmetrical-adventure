import { MutationObserver, type DefaultError, type MutationOptions, type QueryClient } from "@tanstack/query-core";

/** Types a mutation's options, so `onError` and `onSettled` see what `onMutate` returned. */
export function mutationOptions<TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown>(
  options: MutationOptions<TData, TError, TVariables, TContext>,
): MutationOptions<TData, TError, TVariables, TContext> {
  return options;
}

/**
 * Runs a mutation from anywhere: a click handler or code outside React. It goes through the
 * mutation cache, so the UI reads its status by key (useMutationState, useIsMutating), and its
 * callbacks run whether or not anything on screen is watching. Errors stay on the mutation, so the
 * promise never rejects.
 */
export async function runMutation<TData, TError, TVariables, TContext>(
  queryClient: QueryClient,
  options: MutationOptions<TData, TError, TVariables, TContext>,
  variables: TVariables,
): Promise<void> {
  const observer = new MutationObserver(queryClient, options);
  try {
    await observer.mutate(variables);
  } catch {
    // Read by key from the mutation cache (status "error").
  } finally {
    // Detach, so the finished mutation can be garbage-collected after its gcTime.
    observer.reset();
  }
}
