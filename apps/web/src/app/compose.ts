import { composeShared, type SharedDeps } from "@state-demo/core/app";
import { createTitle } from "@state-demo/core/features/title/core";

export interface WebDeps extends SharedDeps {
  setTitle: (title: string) => void;
}

/** The web app: the shared features and the tab title. Wiring only. */
export function composeWeb(deps: WebDeps) {
  const shared = composeShared(deps);
  const title = createTitle({ navigation: shared.navigation, queryClient: deps.queryClient, setTitle: deps.setTitle });
  return { ...shared, title };
}
