/**
 * Synchronous string storage: localStorage on the web and desktop. A saved location is read before
 * the first paint, so it can't be async.
 */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
