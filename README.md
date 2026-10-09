# State demo

A small kanban board, with a live chat per board (the Twitch chat of kanban boards), that demonstrates a React-first state architecture, shared by three apps:

- **The core** is plain TypeScript with no React: stores made with `defineStore`, TanStack Query's client, writes, stream reducers and subscriptions.
- **React depends on the core**, never the reverse: hooks select from it, and components send it intents. The hooks use no DOM and no React Native, so every app shares them.
- **Views are per platform**: DOM views for desktop and web, React Native views for mobile, over the same hooks. Each app's shell decides where they go.
- **The React Compiler** memoizes components, so there's no hand-written `useMemo` or `useCallback`.

The rules are in [NOTES-react-architecture.md](docs/NOTES-react-architecture.md).

```sh
pnpm install
pnpm dev               # desktop (Electron): every feature, the fake server in the main process
pnpm dev:web           # web (Vite, http://localhost:5180): the boards and their chat only
pnpm dev:mobile        # mobile (Expo): the same, in React Native views; press w for the web build
pnpm lint              # ESLint (hook and compiler rules, core rules), plus the architecture check (dependency-cruiser)
pnpm typecheck         # every package and app, each against its own platform's types
pnpm smoke             # desktop: build, run hidden, run a few interactions and log what each fetched;
                       # run twice to see the cached first paint
pnpm smoke:web         # web: build, drive it in Chrome, print what rendered and any console warnings
pnpm smoke:mobile-web  # mobile's React Native views on react-native-web, same steps
```

## Things to try

On desktop. Web and mobile have the same boards, cards and chat, without Settings; mobile also doesn't restore anything on relaunch yet (no synchronous storage).

- **Board chat.** "Board chat" at the bottom left opens it in the right-hand panel, in place of the open card. A few hundred events a second: new messages, and hype on recent ones. Events are applied once per frame; each line re-renders only when its own message changes. The stream runs only while the chat is open. Settings sets the rate.
- **Derived counts.** The sidebar shows each board's Todo count, and the window title shows the current board's. Move a card and every count changes at once, including in the title, which is kept by the core with no component involved.
- **Other people.** With "Simulate other people moving cards" on (Settings), a random card moves every 4 seconds. Only that card and its two columns re-render.
- **Optimistic writes and rollback.** Tick "Fail the next change", then move a card. It moves instantly, the server rejects it, and it moves back.
- **Pending input instead of cache writes.** Add a card with latency at 1500 ms. A ghost card shows the mutation's own input, read by key, until the server answers.
- **WIP limits.** A setting that feeds a derivation: lower "In progress" below its card count and the column turns red.
- **No spinners on relaunch.** Quit and reopen: you're back on the same board, with its data, before any request finishes. "Clear cache and reload" shows the cold start.
- **Per-board client state.** Type a filter, switch boards, come back: the filter is still there.
- **State that comes back, then gets dropped.** Clap (👏) on a board, switch boards, come back: the count is still there. Only the two most recent boards are kept, so after visiting all three, the first starts over. Each board view owns a store while mounted and saves a snapshot to a small LRU (`createScopedContext`, `createSnapshotCache`).
- **Prefetch.** Hover a card, then open it: the comments are usually already loaded.

## Layout

```
packages/
  api/            the contract with the server: types and the Api interface
  fake-server/    the fake backend; desktop runs it in Electron's main, web and mobile in-process
  core/           everything every app shares; runs on every platform (no DOM, no React Native)
    src/platform/core/    no React: the query client and persistence, defineStore, defineQuery, …
    src/platform/react/   createFeatureContext, createScopedContext, selectFrom
    src/features/<name>/
      core/               no React: stores, queries, writes, subscriptions; core/index.ts is its core API
      hooks.ts            its context (private) and hooks
      index.ts            its React API: provider and hooks, everything its views read
    src/app/              composeShared, SharedProviders, startApp
  ui-dom/         DOM views: src/features/<name>/ (index.ts exports them), src/ui/ (presentational), styles.css
  ui-native/      React Native views: the same features and hooks, src/ui/ (presentational)
apps/
  desktop/        Electron. src/main (the fake server over IPC), src/preload, src/renderer/src:
                    app/       compose (shared features + title + server) and providers
                    shell/     the layout: sidebar, board or settings, side panel
                    features/server/   a desktop-only feature: the fake server's knobs, in Settings
  web/            Vite. app/compose (shared features + title), shell/ (board tabs, board, side panel)
  mobile/         Expo. App.tsx (shared features only), shell/ (board tabs, then one screen)
architecture.mjs  the declared edges between features, wherever each lives
types/universal.d.ts  the globals universal packages may use (timers, animation frames, console)
```

The features: `navigation` (where the user is), `cards` (the one owner of card data), `boards` (where cards sit, filters, writes, live updates, the current board), `chat` (per-board rooms: stream, per-frame batching, reducer), `title` (the window or tab title, composed by the apps that have one) and `server` (desktop only).

A feature is a `features/<name>/` folder, and its name is its identity in every package. `packages/core/src/features/boards/`, `packages/ui-dom/src/features/boards/` and `packages/ui-native/src/features/boards/` are one feature: its core and hooks, and its views per platform. One manifest declares the edges between features, and one dependency-cruiser config checks every package and app against it.

Each app builds its own composition: `composeShared` for the features every app has, then its own on top (`createTitle`, `createServer`). Its shell places the views; the views don't know which app they're in. What desktop shows in its side panel (the chat or the open card), mobile shows as the whole screen, from the same navigation state.

The packages are TypeScript source (each `package.json` exports `src/`), compiled by each app's bundler, React Compiler included. React is one version for every app (the pnpm catalog), pinned to the Expo SDK's, since React Native needs an exact match.

### Adding a feature

1. Shared: create `packages/core/src/features/<name>/core/` with a `create<Name>(deps)` factory and `core/index.ts`. Building it must do nothing: no fetching, no subscribing, no I/O. Always-on work goes in `start()`, which returns its cleanup. Only one app: the same layout, in that app's `features/`.
2. Add `hooks.ts` with `createFeatureContext` and its hooks (made with `selectFrom` for a store), and `index.ts` exporting the provider and every hook its views need.
3. Add its views as `features/<name>/` in `ui-dom` and `ui-native`, each with an `index.ts`.
4. Declare it in `architecture.mjs`, with the features it may depend on. Undeclared folders and imports fail `pnpm lint`.
5. Build it in `composeShared` (or the app's compose) after its dependencies, and add its provider in build order.

### What enforces the structure

| Rule                                                                                                                 | Tool                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| The core, the API and the fake server use no DOM, Node or React Native                                               | TypeScript: their tsconfigs have only `types/universal.d.ts`                                                 |
| A package uses only the packages and npm modules its `package.json` lists (so `core` can't reach `react-dom`)        | pnpm's strict layout + dependency-cruiser `not-to-unresolvable`                                              |
| A feature imports only the features `architecture.mjs` lists, in any package                                         | dependency-cruiser `feature-edges:*`, `unknown-feature`                                                      |
| Other code imports a feature through `index.ts` or `core/index.ts`; another package by its name, through its exports | dependency-cruiser `public-api-only`, `packages-by-name`, and the exports maps                               |
| Packages don't import apps; the universal packages have no views; DOM and native views don't use each other          | dependency-cruiser `packages-dont-import-apps`, `universal-packages-have-no-views`, `views-are-per-platform` |
| The core imports no React (`react`, `react-dom`, `@tanstack/react-query`)                                            | ESLint `no-restricted-imports` on every `core/`                                                              |
| Only `platform/core/defineStore.ts` and `platform/react/select.ts` import zustand; only `select.ts` imports `STORE`  | ESLint `no-restricted-imports` everywhere                                                                    |
| Store writes go through named actions                                                                                | TypeScript: a defined store has no `setState`                                                                |
| A feature's core uses only other features' cores and the platform core                                               | dependency-cruiser `core-uses-cores`, `platform-core-is-react-free`                                          |
| Every subscription's unsubscribe is kept (`subscribe`, `watch`)                                                      | ESLint `no-restricted-syntax` on `core/`                                                                     |
| Hooks that read the query or mutation cache end in `Query` / `Mutation`                                              | ESLint `local/source-suffix`                                                                                 |
| Query data is JSON-safe; every query is made with `defineQuery`                                                      | TypeScript (`defineQuery`) + ESLint `no-restricted-syntax`                                                   |
| Hook rules, dependencies, and every React Compiler rule, at error                                                    | `eslint-plugin-react-hooks` (`recommended-latest`, warnings raised to errors)                                |
| No import cycles, including type-only ones                                                                           | dependency-cruiser `no-cycles`                                                                               |
| The platform imports no feature; features don't import an app's composition root or shell                            | dependency-cruiser `platform-is-a-leaf`, `features-dont-import-the-app`                                      |
