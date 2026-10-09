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

## Things to try

- **Board chat.** "Board chat" at the bottom left opens it in the right-hand panel, in place of the open card. A few hundred events a second: new messages, and hype on recent ones. Events are applied once per frame; each line re-renders only when its own message changes. The stream runs only while the chat is open. Settings sets the rate.
- **Derived counts.** The sidebar shows each board's Todo count, and the window title shows the current board's. Move a card and every count changes at once, including in the title, which is kept by the core with no component involved.
- **Other people.** With "Simulate other people moving cards" on (Settings), a random card moves every 4 seconds. Only that card and its two columns re-render.
- **Optimistic writes and rollback.** Tick "Fail the next change", then move a card. It moves instantly, the server rejects it, and it moves back.
- **Pending input instead of cache writes.** Add a card with latency at 1500 ms. A ghost card shows the mutation's own input, read by key, until the server answers.
- **WIP limits.** A setting that feeds a derivation: lower "In progress" below its card count and the column turns red.
- **No spinners on relaunch.** Quit and reopen: you're back on the same board, with its data, before any request finishes. "Clear cache and reload" shows the cold start.
- **Per-board client state.** Type a filter, switch boards, come back: the filter is still there.
- **Prefetch.** Hover a card, then open it: the comments are usually already loaded.

## Layout

```
src/renderer/src/
  platform/
    core/              no React: the query client and persistence, defineQuery, runMutation, Disposer, onNextFrame
    react/             createFeatureContext
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

### Adding a feature

1. Create `features/<name>/core/` with a `create<Name>(deps)` factory and `core/index.ts`. Building it must do nothing: no fetching, no subscribing, no I/O. Always-on work goes in `start()`, which returns its cleanup.
2. Add `hooks.ts` with `createFeatureContext` and the hooks other components read (made with `selectFrom` for a store), and `index.ts` exporting the provider, hooks and views.
3. Declare it in `architecture.mjs`, with the features it may depend on. Undeclared folders and imports fail `pnpm lint`.
4. Build it in `app/compose.ts` after its dependencies, and add its provider in `app/Providers.tsx`.

### What enforces the structure

| Rule                                                                                                                | Tool                                                                          |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| The core imports no React (`react`, `react-dom`, `@tanstack/react-query`)                                           | ESLint `no-restricted-imports` on `core/`                                     |
| Only `platform/core/defineStore.ts` and `platform/react/select.ts` import zustand; only `select.ts` imports `STORE` | ESLint `no-restricted-imports` everywhere                                     |
| Store writes go through named actions                                                                               | TypeScript: a defined store has no `setState`                                 |
| A feature's core uses only other features' cores and the platform core                                              | dependency-cruiser `core-uses-cores`, `platform-core-is-react-free`           |
| Every subscription's unsubscribe is kept (`subscribe`, `watch`)                                                     | ESLint `no-restricted-syntax` on `core/`                                      |
| Hooks that read the query or mutation cache end in `Query` / `Mutation`                                             | ESLint `local/source-suffix`                                                  |
| Query data is JSON-safe; every query is made with `defineQuery`                                                     | TypeScript (`defineQuery`) + ESLint `no-restricted-syntax`                    |
| Hook rules, dependencies, and every React Compiler rule, at error                                                   | `eslint-plugin-react-hooks` (`recommended-latest`, warnings raised to errors) |
| No import cycles, including type-only ones                                                                          | dependency-cruiser `no-cycles`                                                |
| A feature imports only the features `architecture.mjs` lists, through `index.ts` or `core/index.ts`                 | dependency-cruiser `feature-edges:*`, `public-api-only`                       |
| The platform imports no feature; features don't import the app                                                      | dependency-cruiser                                                            |
| Factories take the features they use, never the composed app                                                        | ESLint `local/no-app-deps`                                                    |

## Where each rule lives

| Rule (see the notes)                                                 | Code                                                                                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| React pushes intents, not values (1)                                 | views call `useBoardActions().moveCard(…)`, `useNavigationActions().selectCard(…)`                                                         |
| Non-React work in the core (2, 9)                                    | the window title in `shell/core/shell.ts`; live updates in `boards/core/boards.ts`; saving the location in `navigation/core/navigation.ts` |
| Stores: named actions, shallow-compared named hooks, `read`, `watch` | `platform/core/defineStore.ts`, `platform/react/select.ts`; used by `navigation`, `boards` and `chat`                                      |
| Contexts carry handles (5)                                           | every provider in `app/Providers.tsx` holds a core that never changes                                                                      |
| Leafiest reader, IDs as props (6)                                    | `BoardCard` and `CardTile` take a card ID and read their own entry; `ChatLine` takes a message ID                                          |
| Hooks are the feature's API (7)                                      | `features/*/hooks.ts`, exported from `index.ts`                                                                                            |
| Server data through TanStack Query, normalized (10)                  | `cards/core` owns cards; the board query upserts them and keeps IDs                                                                        |
| Writes are core functions; status read by key (11)                   | `boards/core/boards.ts` with `runMutation`; `usePendingCardsMutation`, `useMoveErrorMutation`                                              |
| High-frequency streams                                               | `chat/core/chat.ts` (per-frame batching), `chat/core/reduce.ts` (structural sharing), `chat/views/ChatPanel.tsx`                           |

## What building it changed

These came up while building and measuring the demo.

1. **List rows need `memo`.** The compiler memoizes elements built in a component's body, but not the ones built in a `.map`. Without `memo`, every chat line re-rendered whenever the log did: 136 line renders per update, 28,829 in two seconds. With `memo` on the row, line renders match the events that touched a line (536 for 549 events). So components rendered from a list (`ChatLine`, `BoardCard`, `BoardLink`) are wrapped in `memo`, the one place we write memoization by hand.
2. **A move renders only what changed.** One move renders its two columns and the moved card, out of eight cards. A column selects its IDs with `select`, which is structurally shared, so a column whose cards didn't change keeps its array.
3. **Status by key replaces holding the mutation.** Writes run through `runMutation` (a `MutationObserver`, detached when done, so the finished mutation is garbage-collected). The UI reads pending creates and the latest move's error with `useMutationState` by key, so a write started outside React shows up the same way.
4. **A hidden window gets no animation frames.** The stream flushes on the next frame, or after 50 ms, whichever comes first (`onNextFrame`). Otherwise the hidden smoke window never applied an event.
5. **A shared derivation can just be a function.** The current board (`currentBoardId`) is cheap, so the window title (core) and the sidebar and shell (hooks) each call it. Nothing is stored.
6. **Concurrent optimistic writes need three rules.** Roll back with an inverse patch, not a snapshot. Only roll back if the value is still the one this write set. Refetch only when the last write to the board settles, whatever its kind (one `isMutating` check over a shared mutation-key prefix).
7. **A refetch already in flight can undo a write.** A create's result is written after cancelling the board's in-flight refetch.
8. **Restored cache entries need the persisted `gcTime` too.** They're built from defaults, not from the query factories (`hydrateOptions`).
9. **A restored ID can name something that's gone.** `currentBoardId` trusts a saved board until the list loads, then falls back to the first.
10. **The server can stay denormalized.** `getBoard` returns every card embedded. The board's query splits it: content goes to the cards feature (`cards.upsert`), and the board's entry keeps only IDs per column.
11. **Batching is the transport's job.** The preload sends every call made in the same tick as one IPC message, like tRPC's `httpBatchLink`.
12. **The persister writes at most once a second.** A change made in the last second before quitting may not be saved.
