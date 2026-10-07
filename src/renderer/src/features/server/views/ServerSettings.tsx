import { observer } from "mobx-react-lite";

import { SkeletonLines } from "../../../platform/ui/primitives";
import { useServer, useSetControls } from "../server";

const LATENCIES = [0, 400, 1500];

/** Demo controls for the fake server. */
export const ServerSettings = observer(function ServerSettings() {
  const controls = useServer().model.controls;
  const { mutate } = useSetControls();
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
