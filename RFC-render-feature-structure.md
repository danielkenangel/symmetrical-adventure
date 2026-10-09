# RFC - Render Feature Structure

# Overview

Desktop's renderer state hangs off one `AppStateController`. Every controller can reach every other controller through it, so dependencies are implicit, cycles form without anyone choosing them, and startup order is a convention nobody can check.

This RFC sets how we split renderer code into features and how we enforce the dependency graph between them at build time.

For looking around some code, I have a repo implementing everything here: [link](https://github.com/danielkenangel/symmetrical-adventure/blob/main/src/main/smoke.ts)

# Summary

- **We will separate code into vertical feature folders.** Each feature lives in `features/<name>/`, for example `features/threads/` or `features/settings/`. Other code imports it only through its `index.ts`.
- **Each feature exports a factory, `createX(deps)`, that takes the features it uses.** There is no central app object, and no feature receives one.
- **Each entity type has one owning feature.** Other features hold IDs and resolve them through the owner, never through copies: a board holds card IDs and gets `CardModel`s from `cards.fromIds(ids)`.
- **One composition root, `app/compose.ts`, builds every feature in dependency order.** It only wires features together and holds no logic. A feature can't receive something that hasn't been built yet, so a construction-time cycle can't be written.
- **We will declare which features may depend on which in one manifest, `architecture.mjs`, and enforce it with dependency-cruiser:**
  - no import cycles, including type-only imports;
  - only declared edges between features;
  - imports go through `index.ts` only;
  - `platform/` imports no feature.
- **We will lint factory parameters with a `no-app-deps` ESLint rule.** It rejects the whole app object, and it rejects functions that hide a back-reference.
- **Cycles are not allowed.** The codebase is greenfield, so we ship without an escape hatch and add one only when a real case forces it.

This mirrors how C++ build systems such as CMake and Bazel structure code: a feature folder is a library target, `index.ts` is its public headers, the manifest is `target_link_libraries`, and a dependency cycle fails the build. TypeScript accepts any import, so we add those rules back with lint.

# Details on the choice

## 1. What desktop does today

Desktop builds its state as one object. `AppStateController` creates more than 30 controllers in its field initializers and passes itself to most of them:

```ts
// AppStateController.ts
private _authController = new AuthController(this);
readonly billingController = new BillingController(this);
private _debugController = new DebugController(this);
private _sidekickController = new SidekickController(this);
private _workspaceController = new WorkspaceController(this);
// ...
// Depends on _userAppStateController + _workspaceController (declared above).
private _onboardingController = new OnboardingController(this);
```

Every controller that holds the root can reach every other controller. Four problems follow from that.

### Any controller reaches any other

A constructor signature says nothing about what a controller uses, because the answer is always "the whole app". The real dependencies only show up deep inside method bodies. Deleting a canvas, for example, reaches into three other subsystems:

```ts
// CanvasesController.ts
async deleteLocalCanvas(canvasId: string, actionSource: CanvasAnalyticsSource) {
  await Invoker.DeleteCanvas(canvasId);
  const canvasUri = createResourceUri({ tag: "CanvasRef", canvasId });
  this._app.sidekick.context.removeResource(canvasUri);
  this._app.workspace.threadsController.drafts.removePinnedResource(canvasUri);
  await this._app.proofState.deleteState(canvasId);
  // ...
}
```

Controllers that never received the root still reach it through a sibling:

```ts
// SidekickConnectionController.ts
reaction(
  () => this.projectController.appStateController.billingController.contextAwareSubscription,
  () => {
    const workspace = this.projectController.appStateController.workspace;
    // ...
  },
);
```

### Cycles form without anyone choosing them

Because every path goes through the root, two controllers can depend on each other without either one importing the other. Navigation and Canvases each call the other's actions:

```ts
// CanvasesController.ts
this.setActiveCanvasId(canvasId);
this._app.navigation.toCanvas(canvasId, filePath);

// NavigationController.ts
@action async toHome() {
  this._app.canvasesController.setActiveCanvasId(null);
  // ...
}
```

Sidekick reads from Workspace, and Workspace reads from Sidekick:

```ts
// SidekickController.ts
get threads() {
  return this.appStateController.workspace.threadsController;
}

// WorkspaceController.ts
get projectInfo() {
  const connectionController = this.appStateController.sidekickController.connectionController;
  // ...
}
```

The import graph is cyclic too. 28 of the modules that `AppStateController.ts` imports also import `AppStateController.ts`. Most of those imports are only used as types, so they happen to be erased at build time, but nothing enforces that. One value import would make the cycle real at runtime.

### Construction order is a convention

Field initializers run in declaration order, so the order of lines in `AppStateController` decides which controllers exist when each constructor runs. `_sidekickController` is declared before `_workspaceController`, so Sidekick guards against a workspace that isn't there yet:

```ts
// SidekickController.ts
get projectController() {
  // FIXME: initialization race condition
  if (!this.appStateController.workspace) {
    return this._sidekickProjectController;
  }
  // ...
}
```

Where a guard isn't enough, the code passes thunks, so the read happens later, once the other controller exists:

```ts
// SidekickProjectController.ts
private _unrealPlugin = new UnrealPluginService(
  (projectPath) =>
    Boolean(this.appStateController.sidekickController.connectionController?.isConnected(projectPath)),
  (projectId, version) => this.appStateController.wsRPCClient.requestEditorShutdown(projectId, version),
  () => this.appStateController.featureFlags.isUnrealInstallCheckDisabled,
);
```

Each thunk is a dependency that no type, import, or lint can see.

### Startup is a hand-ordered script

Some controllers only work after others have initialized, so startup is a series of `init()` calls in a fixed order, spread across several files and held together by comments:

```ts
// AuthController.ts
// AppState init builds the RPC client from setAtStartup flags, so resolve first.
await bootProgress.trackStep(BOOT_STEP.FEATURE_FLAGS_INIT, () =>
  this.appStateController.debugController.featureFlagController.init(profile),
);

// only init after successful authentication, so that all required tokens are present.
await bootProgress.trackStep(BOOT_STEP.APP_STATE_INIT, () => this.appStateController.init(currentOrganizationId, {/* ... */}));
```

```ts
// AppStateController.ts, inside init()
// initialize SidekickController as early as possible
this._sidekickController.init();
// ...
await trackStep(BOOT_STEP.WORKSPACE_INIT, () => this.workspace.init(opts?.overrideWorkspaceId));
await trackStep(BOOT_STEP.THREADS_INIT, () => this.sidekickController.threads.init());
```

Controllers that are created early but only initialized later spend part of their life half-built. Desktop has 26 `connectionController?.` checks for a field that is `null` until `init()` runs.

### What we want instead

Each of these problems maps to a rule in this RFC:

| Desktop problem                          | Rule                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| Any controller reaches any other         | Explicit deps, and no app object (section 3)                                     |
| Cycles form without anyone choosing them | Declared edges and `no-cycles`, checked in CI (section 5)                        |
| Construction order is a convention       | Build order is dependency order, in `compose.ts` (section 4)                     |
| Startup is a hand-ordered script         | A feature exists once its dependencies do, with no separate `init()` (section 4) |

## 2. Vertical folders

Code is grouped by what it does for the user, not by what kind of code it is. Everything for boards (queries, models, writes, views) lives in one folder, instead of being spread across `models/`, `data/`, and `views/`.

```
src/renderer/src/
  platform/          shared, feature-agnostic code; imports no feature
    data/            query client, cache persistence
    ui/              presentational primitives; take plain values
    lifecycle.ts
    react.tsx
  features/
    navigation/
    boards/
      index.ts       the public API
      boards.ts      createBoards(deps), useBoards
      BoardModel.ts
      queries.ts
      mutations.ts
      views/
    cards/
    server/
    shell/           the screen frame; composes the others
  app/
    compose.ts       the composition root
  main.tsx
```

A feature's `index.ts` is its public API. Anything not exported there is private, and the build enforces it:

```ts
// features/boards/index.ts
export { BoardModel } from "./BoardModel";
export { BoardsProvider, createBoards, useBoards, type Boards, type BoardsDeps } from "./boards";
export { boardKeys, type BoardsApi } from "./queries";
export { BoardView } from "./views/BoardView";
```

`platform/` holds code that every feature may use and that knows about none of them: the query client, generic UI primitives, lifecycle helpers. If code in `platform/` needs to import a feature, it belongs in that feature.

## 3. Factories and explicit dependencies

Each feature exports one factory. It receives a deps object listing what it uses, and returns the feature's public surface:

```ts
// features/cards/cards.ts
export interface CardsDeps {
  api: CardsApi;
  queryClient: QueryClient;
}

export function createCards(deps: CardsDeps): Cards {
  // ...
}
```

When a feature depends on another feature, it takes that feature's public type. The shell shows the current board, so it depends on navigation and boards:

```ts
// features/shell/ShellModel.ts
export interface ShellModelDeps {
  navigation: Navigation;
  boards: Boards;
}
```

The signature is the documentation: reading `ShellModelDeps` tells you which features the shell can touch. We don't narrow further with `Pick<Boards, ...>`. A feature's public type is already a curated surface, so narrowing it adds churn to every signature without changing the graph.

There is no central app object. The composed app exists only inside `compose.ts`, and the `no-app-deps` rule rejects it anywhere else:

```ts
export function createShell(app: ComposedApp) {}
//                          ^^^ Take the features you use, not 'ComposedApp'.
//                              Pass a deps object, e.g. { boards, navigation }.
```

`no-app-deps` also rejects a dependency that is a function returning a value, such as `getBoards: () => Boards`. A thunk like that is how a back-reference hides: it lets a feature read something built after it, which is a cycle the import graph can't see.

```ts
export function createNavigation(deps: { getShell: () => Shell }) {}
//                                       ^^^^^^^^ a function that returns a value: a hidden back-edge.
```

Callbacks that return nothing, such as `setTitle: (title: string) => void`, are fine: they push data out and don't read anything back.

### One owner per entity

Each entity type belongs to one feature, which defines, models, and renders it. The cards feature owns cards: their queries, `CardModel`, `CardTile`, and `CardDetail`. Other features hold card IDs and resolve them through the owner:

```ts
// features/boards/BoardModel.ts: a board knows where its cards sit, by ID
column(column: Column) {
  return this.deps.cards.fromIds(this.data.columns[column]); // CardModel[]
}
```

```tsx
// features/boards/views/BoardView.tsx: the view passes models straight through
{view.cards.map((card) => <CardTile key={card.id} card={card} ... />)}
```

The board's view never looks a card up, and no feature keeps a copy of another feature's entities. When the server sends a board with its cards embedded, the board's query hands the cards to the owner (`cards.upsert(cards)`) and keeps only the IDs. The edge runs one way, `boards → cards`, and the cards feature depends on no other feature.

## 4. The composition root

<!-- TODO: iterate -->

## 5. Static enforcement

`architecture.mjs` lists every feature and the features it may import. It is the one place the feature graph is written down, so adding an edge is a one-line change that shows up in review:

```js
// architecture.mjs
export const features = {
  navigation: [],
  boards: ["cards"],
  cards: [],
  server: [],
  shell: ["navigation", "boards", "server"],
};
```

`.dependency-cruiser.mjs` generates its rules from this manifest, and `pnpm lint` runs it in CI:

| Rule                           | Rejects                                                              |
| ------------------------------ | -------------------------------------------------------------------- |
| `no-cycles`                    | Any import cycle, including through type-only imports                |
| `feature-edges:<name>`         | An import from one feature to another that the manifest doesn't list |
| `unknown-feature`              | A folder under `features/` that the manifest doesn't declare         |
| `public-api-only`              | Importing another feature's internals instead of its `index.ts`      |
| `platform-is-a-leaf`           | `platform/` importing a feature or the app                           |
| `features-dont-import-the-app` | A feature importing `app/`                                           |

Type-only imports count. Type cycles don't crash at runtime, but they couple features just as tightly, so the rules treat them the same.

A violation names the rule and both files:

```
error feature-edges:boards: src/renderer/src/features/boards/BoardModel.ts → src/renderer/src/features/shell/index.ts
```

### No escape hatch

Cycles are not allowed, and there is no opt-in. Every cycle we have met so far had a better shape: move the shared piece into the feature both sides already depend on, or add a feature above both that composes them. The shell is the second kind: it is where navigation and boards meet, so neither depends on the other.

If a real case ever forces a cycle, we add a reviewed opt-in then, listed in the manifest with a reason.

## 6. Adding a feature

<!-- TODO: iterate -->

## 7. Alternatives considered

- **`eslint-plugin-boundaries`.** Enforces element types and allowed imports from ESLint. It has no cycle detection that follows type-only imports across the project, so we would still need a second tool.
- **Nx module boundaries.** Tag-based rules over workspace projects. It works at the package level and assumes an Nx workspace; our features are folders inside one package.
- **madge.** Finds cycles but has no notion of allowed edges or public APIs.
- **A DI container (InversifyJS, tsyringe).** Resolves construction order at runtime, through decorators and tokens. A plain function call in `compose.ts` gets the same order with types, without a library, and makes cycles impossible to write instead of detecting them at startup.
