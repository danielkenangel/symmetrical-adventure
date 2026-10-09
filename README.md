# State demo

A small Electron kanban board, with a live chat per board (the Twitch chat of kanban boards), that demonstrates a React-first state architecture:

- **The core** is plain TypeScript with no React: stores made with `defineStore`, TanStack Query's client, writes, stream reducers and subscriptions.
- **React depends on the core**, never the reverse: hooks select from it, and components send it intents.
- **The React Compiler** memoizes components, so there's no hand-written `useMemo` or `useCallback`.

The rules are in [NOTES-react-architecture.md](NOTES-react-architecture.md). The MobX version of this demo is on `main`, for comparison.

```sh
pnpm install
pnpm dev          # run it
pnpm lint         # ESLint (hook and compiler rules, core rules), plus the architecture check (dependency-cruiser)
pnpm typecheck
pnpm smoke        # build, run hidden, run a few interactions and log what each fetched;
                  # run twice to see the cached first paint
```

## Layout

```
src/renderer/src/
  platform/
    core/              no React: the query client and persistence, defineQuery, createSnapshotCache, runMutation, Disposer, onNextFrame
    react/             createFeatureContext, createScopedContext
    ui/                presentational components: plain values only
  features/<name>/
    core/              no React: stores, queries, writes, subscriptions; core/index.ts is its core API
    hooks.ts           its context (private) and hooks
    views/             components
    index.ts           its React API: provider, hooks, views
  features/
    navigation/        where the user is (restored, saved on change)
    cards/             the one owner of card data: queries, upsert; CardTile, CardDetail
    boards/            where cards sit (IDs per column), filters, writes, live updates; BoardView   → cards, navigation
    server/            the fake server's knobs; ServerSettings
    chat/              per-board chat rooms: stream, per-frame batching, reducer; ChatPanel
    shell/             the window title (core), the layout                → navigation, boards, server, chat
  app/
    compose.ts         builds every feature's core in dependency order; wiring only
    Providers.tsx      hands each core to React, in build order
architecture.mjs       the declared edges between features
```
