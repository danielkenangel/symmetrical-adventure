import { SkeletonLines } from "../../../platform/ui/primitives";
import { useServerActions, useServerControls } from "../hooks";

const LATENCIES = [0, 400, 1500];
const CHAT_RATES = [0, 50, 300, 1000];

/** Demo controls for the fake server. */
export function ServerSettings() {
  const controls = useServerControls();
  const { setControls } = useServerActions();
  return (
    <section className="settings-group">
      <h2>Server</h2>
      {!controls ? (
        <SkeletonLines lines={4} />
      ) : (
        <div className="fields">
          <label>
            Latency
            <select value={controls.latencyMs} onChange={(event) => void setControls({ latencyMs: Number(event.target.value) })}>
              {LATENCIES.map((ms) => (
                <option key={ms} value={ms}>
                  {ms} ms
                </option>
              ))}
            </select>
          </label>
          <label>
            Board chat
            <select value={controls.chatRate} onChange={(event) => void setControls({ chatRate: Number(event.target.value) })}>
              {CHAT_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate === 0 ? "Off" : `${rate} events/s`}
                </option>
              ))}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={controls.failNext} onChange={(event) => void setControls({ failNext: event.target.checked })} />
            Fail the next change (shows an optimistic update rolling back)
          </label>
          <label className="check">
            <input type="checkbox" checked={controls.remoteActivity} onChange={(event) => void setControls({ remoteActivity: event.target.checked })} />
            Simulate other people moving cards
          </label>
        </div>
      )}
    </section>
  );
}
