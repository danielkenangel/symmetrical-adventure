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
 * A feature core's lifecycle, run by the composition root. `start` begins work that runs whether or
 * not anything on screen reads it (live updates, saving state, the window title) and returns its
 * cleanup. Building a core does nothing: no fetching, no subscribing, no I/O.
 */
export interface Lifecycle {
  start?(): () => void;
}
