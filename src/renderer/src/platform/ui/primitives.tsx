/**
 * Presentational components: props only, plain values only. They never receive a model, so they
 * never need to be observers (see the "data leaving the observable graph" rule).
 */

export function cls(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(" ");
}

export function Badge({ count, pending }: { count: number; pending: boolean }) {
  if (pending) return <span className="badge pending" aria-label="Loading" />;
  return <span className="badge">{count}</span>;
}

export function SkeletonLines({ lines }: { lines: number }) {
  return (
    <div className="skeleton-lines" aria-label="Loading">
      {Array.from({ length: Math.max(1, lines) }, (_, index) => (
        <div key={index} className="skeleton-line" />
      ))}
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="columns" aria-label="Loading board">
      {[0, 1, 2].map((index) => (
        <div key={index} className="column skeleton-column">
          <SkeletonLines lines={4} />
        </div>
      ))}
    </div>
  );
}
