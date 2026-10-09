/**
 * The last state of each key's scoped store (a thread's UI), kept after its view unmounts so
 * reopening the key starts where it left off. Plain data, least recently saved dropped past `max`;
 * mounted keys save too, so they count toward `max`.
 * Made in a feature's factory, like a store, so a recompose drops it.
 */
export interface SnapshotCache<T> {
  get(id: string): T | undefined;
  /** Saves the key's state and marks it most recently used. */
  set(id: string, state: T): void;
  /** Forgets a key, e.g. when the thing it belongs to is deleted. */
  delete(id: string): void;
  clear(): void;
}

export function createSnapshotCache<T>({ max }: { max: number }): SnapshotCache<T> {
  // A Map keeps insertion order, so re-inserting on save keeps the oldest first.
  const entries = new Map<string, T>();
  return {
    get: (id) => entries.get(id),
    set(id, state) {
      entries.delete(id);
      entries.set(id, state);
      for (const oldest of entries.keys()) {
        if (entries.size <= max) return;
        entries.delete(oldest);
      }
    },
    delete(id) {
      entries.delete(id);
    },
    clear() {
      entries.clear();
    },
  };
}
