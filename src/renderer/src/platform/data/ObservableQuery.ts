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
  // Closures rather than the observer itself, so the key type stays out of the class's shape
  // (an ObservableQuery<Board, ["board", string]> is then assignable to ObservableQuery<Board>).
  private readonly current: () => QueryObserverResult<TData, Error>;
  private readonly atom: IAtom;

  constructor(client: QueryClient, options: QueryObserverOptions<TData, Error, TData, TData, TKey>) {
    const observer = new QueryObserver<TData, Error, TData, TData, TKey>(client, options);
    this.current = () => observer.getCurrentResult();
    let unsubscribe = () => {};
    this.atom = createAtom(
      `query ${JSON.stringify(options.queryKey)}`,
      () => {
        // A model can outlive its cache entry: once nothing reads a query, the cache drops it
        // after gcTime. Re-resolve the entry before subscribing, or we'd stay attached to the
        // dropped one and never see prefetches or cache writes again.
        observer.setOptions(options);
        unsubscribe = observer.subscribe(() => this.atom.reportChanged());
      },
      () => unsubscribe(),
    );
  }

  @computed private get result(): QueryObserverResult<TData, Error> {
    this.atom.reportObserved();
    return this.current();
  }

  // Separate computeds, so readers of `data` aren't re-run when only `isFetching` flips: a
  // refetch that returns equal data keeps the same object (structural sharing).
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
