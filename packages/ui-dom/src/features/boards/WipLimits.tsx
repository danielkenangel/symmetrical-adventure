import { COLUMN_TITLES, COLUMNS, type Column } from "@state-demo/api";
import { useBoardActions, useBoardNameQuery, useColumnQuery } from "@state-demo/core/features/boards";

const LIMITS = [null, 1, 2, 3, 4, 5, 6];
const NO_COLUMN = { cardIds: [] as readonly string[], limit: null };

/** Server-side settings that feed a derivation: each column's "over the limit" state. */
export function WipLimits({ boardId }: { boardId: string }) {
  return (
    <section className="settings-group">
      <h2>Work-in-progress limits: {useBoardNameQuery(boardId).data}</h2>
      <div className="fields">
        {COLUMNS.map((column) => (
          <WipLimit key={column} boardId={boardId} column={column} />
        ))}
      </div>
    </section>
  );
}

function WipLimit({ boardId, column }: { boardId: string; column: Column }) {
  const { cardIds, limit } = useColumnQuery(boardId, column).data ?? NO_COLUMN;
  const { setWipLimit } = useBoardActions();
  return (
    <label>
      {COLUMN_TITLES[column]}
      <select
        value={limit ?? ""}
        onChange={(event) => void setWipLimit(boardId, column, event.target.value === "" ? null : Number(event.target.value))}
      >
        {LIMITS.map((option) => (
          <option key={option ?? "none"} value={option ?? ""}>
            {option === null ? "No limit" : option}
          </option>
        ))}
      </select>
      <span className="muted">{cardIds.length} cards now</span>
    </label>
  );
}
