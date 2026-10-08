/** Presentational components: props only, plain values only. They never import a feature. */

import type { ReactNode } from "react";

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

/** The header every side panel uses: a title, and controls on the right. */
export function PanelHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <header className="panel-header">
      <h2>{title}</h2>
      {children}
    </header>
  );
}
