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
