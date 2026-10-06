import { QueryObserver, type QueryClient, type QueryKey, type QueryObserverOptions, type QueryObserverResult } from "@tanstack/react-query";
import { computed, createAtom, type IAtom } from "mobx";

/**
 * One query, readable from MobX.
 *
 * It subscribes to the query only while something observes it, and unsubscribes when nothing
 * does; the query cache keeps the data either way, so nothing needs disposing. The options are
 * fixed: a model that needs a different key is a different model.
 */
export class ObservableQuery<TData, TKey extends QueryKey = QueryKey> {
  // Only what's used, so the key type stays out of the class's shape.
  private readonly observer: Pick<QueryObserver<TData, Error>, "getCurrentResult" | "subscribe">;
  private readonly atom: IAtom;
  private unsubscribe = () => {};

  constructor(client: QueryClient, options: QueryObserverOptions<TData, Error, TData, TData, TKey>) {
    this.observer = new QueryObserver<TData, Error, TData, TData, TKey>(client, options);
    this.atom = createAtom(
      `query ${JSON.stringify(options.queryKey)}`,
      () => {
        this.unsubscribe = this.observer.subscribe(() => this.atom.reportChanged());
      },
      () => this.unsubscribe(),
    );
  }

  private get result(): QueryObserverResult<TData, Error> {
    this.atom.reportObserved();
    return this.observer.getCurrentResult();
  }

  // Computed, so readers of `data` aren't re-run when only `isFetching` flips: a refetch that
  // returns equal data keeps the same object (structural sharing), and nothing downstream runs.
  @computed get data(): TData | undefined {
    return this.result.data;
  }

  @computed get isPending(): boolean {
    return this.result.isPending;
  }

  @computed get isFetching(): boolean {
    return this.result.isFetching;
  }

  @computed get error(): Error | null {
    return this.result.error;
  }
}
