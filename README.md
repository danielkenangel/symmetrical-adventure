# State demo

A small Electron kanban board.

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
