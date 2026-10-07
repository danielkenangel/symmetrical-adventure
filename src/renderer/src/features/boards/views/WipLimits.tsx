import { observer } from "mobx-react-lite";

import { COLUMN_TITLES, COLUMNS } from "../../../../../shared/api";
import type { BoardModel } from "../BoardModel";
import { useSetWipLimit } from "../hooks";

const LIMITS = [null, 1, 2, 3, 4, 5, 6];

/** Server-side settings that feed a derivation: each column's "over the limit" state. */
export const WipLimits = observer(function WipLimits({ board }: { board: BoardModel }) {
  const { mutate } = useSetWipLimit(board.id);
  return (
    <section className="settings-group">
      <h2>Work-in-progress limits: {board.name}</h2>
      <div className="fields">
        {COLUMNS.map((column) => (
          <label key={column}>
            {COLUMN_TITLES[column]}
            <select
              value={board.limit(column) ?? ""}
              onChange={(event) => mutate({ column, limit: event.target.value === "" ? null : Number(event.target.value) })}
            >
              {LIMITS.map((limit) => (
                <option key={limit ?? "none"} value={limit ?? ""}>
                  {limit === null ? "No limit" : limit}
                </option>
              ))}
            </select>
            <span className="muted">{board.column(column).total} cards now</span>
          </label>
        ))}
      </div>
    </section>
  );
});
