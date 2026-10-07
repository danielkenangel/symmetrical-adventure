import type { QueryClient } from "@tanstack/react-query";
import { computed } from "mobx";

import type { ServerControls } from "../../../../shared/api";
import { ObservableQuery } from "../../platform/data/ObservableQuery";
import type { ServerQueries } from "./queries";

export interface ServerModelDeps {
  queryClient: QueryClient;
  queries: ServerQueries;
}

/** The fake server's knobs, shown in Settings. */
export class ServerModel {
  private readonly query: ObservableQuery<ServerControls>;

  constructor(deps: ServerModelDeps) {
    this.query = new ObservableQuery(deps.queryClient, deps.queries.controls());
  }

  @computed get controls(): ServerControls | undefined {
    return this.query.data;
  }
}
