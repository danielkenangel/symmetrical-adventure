import { observer } from "mobx-react-lite";

import { CACHE_STORAGE_KEY } from "../../../platform/data/queryClient";
import { WipLimits } from "../../boards";
import { ServerSettings } from "../../server";
import { useShell } from "../shell";

export const SettingsView = observer(function SettingsView() {
  const board = useShell().model.currentBoard;
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
