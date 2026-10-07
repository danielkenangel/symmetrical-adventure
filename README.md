# State demo

A small Electron kanban board that demonstrates the state-management architecture in the RFC appendix: MobX models for synchronous state, TanStack Query for anything async, no React Compiler.

```sh
pnpm install
pnpm dev          # run it
pnpm lint         # ESLint, plus the architecture check (dependency-cruiser)
pnpm typecheck
pnpm smoke        # build, run hidden, print what rendered; run twice to see the cached first paint
```

## Things to try

- **Derived counts.** The sidebar shows each board's Todo count, and the window title shows the current board's. Move a card and every count changes at once, including in the title.
- **Other people.** With "Simulate other people moving cards" on (Settings), a random card moves every 4 seconds. Only that card re-renders.
- **Optimistic writes and rollback.** Tick "Fail the next change", then move a card. It moves instantly, the server rejects it, and it moves back.
- **Pending input instead of cache writes.** Add a card with latency at 1500 ms. A ghost card shows the mutation's own input until the server answers.
- **WIP limits.** A setting that feeds a derivation: lower "In progress" below its card count and the column turns red.
- **No spinners on relaunch.** Quit and reopen: you're back on the same board, with its data, before any request finishes. "Clear cache and reload" shows the cold start.
- **Per-board client state.** Type a filter, switch boards, come back: the filter is still there.
- **Prefetch.** Hover a card, then open it: the comments are usually already loaded.

## Layout

```
src/renderer/src/
  platform/            shared by every feature, depends on none: ObservableQuery, the query client and
                       persistence, Disposer/Lazy/memo, createFeatureContext, presentational ui/
  features/
    navigation/        where the user is (restored, saved on change)
    boards/            boards, their queries, mutations and live updates; BoardView, WipLimits
    cards/             card comments; CardDetail                                      → boards
    server/            the fake server's knobs; ServerSettings
    shell/             what's on screen, the title, the layout       → navigation, boards, cards, server
  app/
    compose.ts         the integration point: builds every feature in dependency order; wiring only
    Providers.tsx      hands each feature to React
architecture.mjs       the declared edges between features, and the opt-in lists for cycles and Lazy<T>
```

Each feature folder has an `index.ts` (its public API), a `createX(deps)` factory, and a provider and hook for its views.

### Adding a feature

1. Create `features/<name>/` with `index.ts`, a `create<Name>(deps)` factory, and `createFeatureContext` for its provider and hook.
2. Declare it in `architecture.mjs`, with the features it may depend on. Undeclared folders and imports fail `pnpm lint`.
3. Build it in `app/compose.ts`, after its dependencies, and add its provider in `app/Providers.tsx`.
4. If it has always-on work (subscriptions, saving, reactions), return it from `start()`; the app starts and stops it.

### What enforces the structure

| Rule | Tool |
|---|---|
| No import cycles, including type-only ones | dependency-cruiser `no-cycles` |
| A feature imports only the features `architecture.mjs` lists for it | dependency-cruiser `feature-edges:*` |
| Other features and the app import a feature through its `index.ts` | dependency-cruiser `public-api-only` |
| The platform imports no feature; features don't import the app | dependency-cruiser |
| Constructors and `createX` factories take narrow deps, never the composed app | ESLint `local/narrow-deps` |
| No hidden back-edges: function deps that return a value are rejected; `Lazy<T>` only in allowlisted files | ESLint `local/narrow-deps` |
| Views are observers; `platform/ui` takes plain values | ESLint folder rules |

A cycle can't be written in `compose.ts` either: a feature can only receive features built above it.

## Where each decision lives

| Appendix | Code |
|---|---|
| Async work in queries and mutations; models never `await` (1a–1c) | `features/*/queries.ts`, `features/boards/mutations.ts` |
| Server data read through the cache, never copied (1d) | `platform/data/ObservableQuery.ts`, `features/boards/BoardModel.ts` |
| Optimistic updates through the cache, with rollback (1d) | `features/boards/mutations.ts` |
| Pending input without touching the cache (1d) | `usePendingCards` in `features/boards/hooks.ts` |
| Derived state (2) | `BoardModel.todoCount`, `BoardModel.column()` (filter, order, WIP limit) |
| Always-on work owned and disposed in one place (3) | each feature's `start()`, run by `startApp` in `app/compose.ts` |
| Models built from IDs; one per ID (6b) | `memo` in `boards.ts` and `cards.ts`; `ShellModel.currentBoard` |
| Caching and persistence with `meta: { persist: true }` (6c) | `platform/data/queryClient.ts`, restore-before-render in `main.tsx` |
| Runtime strict mode (5g) | `configure()` in `main.tsx` |
| `observer` without the compiler (4d) | `features/*/views/*`; one hand-written `useCallback` per callback passed into rows |

## What building it changed

These came up while building and reviewing the demo, and changed the appendix.

1. **Families keyed only by an ID aren't computeds.** `computedFn((id) => new Model(id))` reads no observables, so `reactionRequiresObservable` flags it in development. A plain memo map is the right tool (`boards.model()`); keep `computedFn` for derivations that read observables (`BoardModel.column()`).
2. **A model can outlive its cache entry.** Once nothing reads a query, the cache drops it after `gcTime`. `ObservableQuery` re-resolves the entry each time it's observed again, or a memoized model would stay attached to the dropped entry and miss prefetches and cache writes.
3. **Concurrent optimistic writes need three rules.** Roll back with an inverse patch, not a snapshot (restoring the whole board also undid live changes that landed meanwhile), and back to the card's old position. Only roll back if the value is still the one this write set (a later move of the same card would otherwise be undone). And refetch only when the last write to the board settles, whatever its kind: every board write shares a mutation-key prefix, so one `isMutating` check covers moves, limit changes and creates.
4. **A refetch already in flight can undo a write.** A create's result is written after cancelling the board's in-flight refetch; otherwise a response read before the card existed lands afterwards and removes it.
5. **Restored cache entries need the persisted `gcTime` too.** They're built from defaults, not from the query factories, so without `hydrateOptions` they got the default 5 minutes: unread that long, they were dropped, and then deleted from disk.
6. **A restored ID can name something that's gone.** `ShellModel.currentBoard` trusts a saved board until the list loads, then falls back to the first.
7. **`eslint-plugin-mobx` assumes legacy decorators.** Its recommended `missing-make-observable` requires `makeObservable(this)`, which standard decorators don't need. It's turned off here.
8. **`missing-observer` flags every capitalized function.** Applied everywhere, it forces presentational components to be observers that read nothing, which `reactionRequiresObservable` then warns about. The fix is a folder rule: `views/` components read models and must be observers; `ui/` components take plain values and can't import models.
9. **The lint rules needed the same scrutiny as the code.** The async-action ban has to cover fields (`@action loadAction = async () => …`) and `@action.bound`. `narrow-deps` has to resolve named `interface FooDeps` declarations (how every model declares its dependencies), follow `extends`, type arguments and function results, and survive self-referencing types.
10. **`fromResource` warns on reads outside a reaction.** The query adapter uses `createAtom` instead, with the same subscribe-while-observed behavior.
11. **The adapter shouldn't carry the query key in its type.** It stores a closure rather than the observer, so `ObservableQuery<Board, ["board", string]>` is assignable to `ObservableQuery<Board>`.
12. **The persister writes at most once a second.** A change made in the last second before quitting may not be saved.
13. **One central session object recreated desktop's problem.** It built every model, components reached through it to anything, and the only thing stopping a cycle was a list of forbidden type names. It's now per-feature folders, a wiring-only composition root, and an import graph declared in `architecture.mjs` and checked by dependency-cruiser. Moving to it surfaced two edges that would have been cycles: a card tile prefetching comments (boards → cards) and selecting a card (boards → navigation). Both now arrive as props, wired by the shell.
14. **Intra-feature type cycles count.** `CardModel` importing a type from `cards.ts`, which imports `CardModel`, is a cycle once type-only imports are checked. Queries live in their own file in each feature for that reason.

Not shown here: the "rebuilt when its inputs change" model shape (`@computed({ keepAlive: true })` builders, appendix 6b shape 1), mutation `scope`, and the suffix-based rules beyond naming (batching, no actions in render, pure computeds).
