import { untracked } from "mobx";

/** Collects cleanups and runs them in reverse order. The one disposer type in the app. */
export class Disposer {
  private readonly cleanups: Array<() => void> = [];

  add(cleanup: () => void): void {
    this.cleanups.push(cleanup);
  }

  dispose(): void {
    for (const cleanup of this.cleanups.splice(0).reverse()) cleanup();
  }
}

/**
 * What a feature may do beyond exposing models: start work that must run whether or not anything
 * on screen reads it (live updates, saving state, the window title). The composition root starts
 * every feature once and owns the returned cleanups.
 */
export interface Startable {
  start?(): () => void;
}

/**
 * The one sanctioned back-edge: a dependency read later instead of at construction. Plain function
 * dependencies are rejected by lint (they hide back-edges); a Lazy<T> is allowed only in files
 * listed in architecture.mjs, so every one is reviewed.
 */
export interface Lazy<T> {
  readonly get: () => T;
}

export function lazy<T>(get: () => T): Lazy<T> {
  return { get };
}

/** Builds a model once per key. Construction is pure and untracked, so it can happen mid-render. */
export function memo<K, V>(cache: Map<K, V>, key: K, build: () => V): V {
  let value = cache.get(key);
  if (value === undefined) {
    value = untracked(build);
    cache.set(key, value);
  }
  return value;
}
