import { COLUMN_TITLES, COLUMNS, type Column } from "../../../../../shared/api";
import { useBoardActions, useBoardName, useColumn } from "../hooks";

const LIMITS = [null, 1, 2, 3, 4, 5, 6];

/** Server-side settings that feed a derivation: each column's "over the limit" state. */
export function WipLimits({ boardId }: { boardId: string }) {
  return (
    <section className="settings-group">
      <h2>Work-in-progress limits: {useBoardName(boardId)}</h2>
      <div className="fields">
        {COLUMNS.map((column) => (
          <WipLimit key={column} boardId={boardId} column={column} />
        ))}
      </div>
    </section>
  );
}

function WipLimit({ boardId, column }: { boardId: string; column: Column }) {
  const { cardIds, limit } = useColumn(boardId, column);
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
