import { observer } from "mobx-react-lite";

import { COLUMN_TITLES, COLUMNS } from "../../../shared/api";
import { useApp } from "../app/AppContext";
import { useSetControls, useSetWipLimit } from "../data/mutations";
import { CACHE_STORAGE_KEY } from "../data/queryClient";
import type { BoardModel } from "../models/BoardModel";
import { SkeletonLines } from "../ui/primitives";

const LATENCIES = [0, 400, 1500];
const LIMITS = [null, 1, 2, 3, 4, 5, 6];

export const SettingsView = observer(function SettingsView() {
  const { session } = useApp();
  const board = session.currentBoard;
  return (
    <section className="settings">
      <h1>Settings</h1>
      <ServerSettings />
      {board && <WipLimits board={board} />}
      <section className="settings-group">
        <h2>Saved cache</h2>
        <p className="muted">Boards are saved to disk, so a relaunch shows them without loading. Clear the cache to see the cold start.</p>
        <button
          type="button"
          onClick={() => {
            window.localStorage.removeItem(CACHE_STORAGE_KEY);
            window.location.reload();
          }}
        >
          Clear cache and reload
        </button>
      </section>
    </section>
  );
});

/** Demo controls for the fake server. Writes are optimistic, so the toggles respond instantly. */
const ServerSettings = observer(function ServerSettings() {
  const { session } = useApp();
  const { mutate } = useSetControls();
  const controls = session.server.controls;
  return (
    <section className="settings-group">
      <h2>Server</h2>
      {!controls ? (
        <SkeletonLines lines={3} />
      ) : (
        <div className="fields">
          <label>
            Latency
            <select value={controls.latencyMs} onChange={(event) => mutate({ latencyMs: Number(event.target.value) })}>
              {LATENCIES.map((ms) => (
                <option key={ms} value={ms}>
                  {ms} ms
                </option>
              ))}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={controls.failNext} onChange={(event) => mutate({ failNext: event.target.checked })} />
            Fail the next change (shows an optimistic update rolling back)
          </label>
          <label className="check">
            <input type="checkbox" checked={controls.remoteActivity} onChange={(event) => mutate({ remoteActivity: event.target.checked })} />
            Simulate other people moving cards
          </label>
        </div>
      )}
    </section>
  );
});

/** Server-side settings that feed a derivation: each column's "over the limit" state. */
const WipLimits = observer(function WipLimits({ board }: { board: BoardModel }) {
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
