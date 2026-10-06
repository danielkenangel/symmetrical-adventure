# State demo

A small Electron kanban board built to stress-test the state-management patterns in the RFC appendix: MobX models for synchronous state, TanStack Query for anything async, no React Compiler.

```sh
pnpm install
pnpm dev          # run it
pnpm test         # model tests (strict MobX, warnings fail) and lint-guardrail tests
pnpm lint
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

## Where each decision lives

| Appendix | Code |
|---|---|
| Async work in queries and mutations; models never `await` (1a–1c) | `data/queries.ts`, `data/mutations.ts` |
| Server data read through the cache, never copied (1d) | `data/ObservableQuery.ts`, `models/BoardModel.ts` |
| Optimistic updates through the cache, with rollback (1d) | `useMoveCard`, `useSetWipLimit` in `data/mutations.ts` |
| Pending input without touching the cache (1d) | `useCreateCard` + `useMutationState` in `views/BoardView.tsx` |
| Derived state (2) | `BoardModel.todoCount`, `BoardModel.column()` (filter, order, WIP limit) |
| One owner for reactions that must always run (3, 6b) | `app/AppRoot.ts`: live updates, title, saving the location |
| Live changes patched into the cache (6c) | `app/liveUpdates.ts`, `data/boardUpdates.ts` |
| Models built from identities, no app object (6b) | `models/Session.ts` |
| Narrow constructor dependencies (6b) | every model's `deps`; enforced by `lint/rules/narrow-deps.mjs` |
| Caching and persistence with `meta: { persist: true }` (6c) | `data/queries.ts`, `data/queryClient.ts`, restore-before-render in `main.tsx` |
| Runtime strict mode (5g) | `configure()` in `main.tsx` and in the tests |
| Lint guardrails (5g) | `eslint.config.mjs`, `lint/rules/*`, proven by `lint/guardrails.test.mjs` |
| `observer` without the compiler (4d) | `views/*`; one hand-written `useCallback` in `BoardView` for the card rows |

## What building it changed

These came up while building and testing the demo, and differ from or add to the appendix:

1. **Families keyed only by an ID aren't computeds.** `computedFn((id) => new Model(id))` reads no observables, so `reactionRequiresObservable` flags it in development. A plain memo map is the right tool (`Session.board()`); keep `computedFn` for derivations that read observables (`BoardModel.column()`).
2. **`eslint-plugin-mobx` assumes legacy decorators.** Its recommended `missing-make-observable` requires `makeObservable(this)`, which standard decorators don't need. It's turned off here.
3. **`missing-observer` flags every capitalized function.** Applied everywhere, it forces presentational components to be observers that read nothing, which `reactionRequiresObservable` then warns about. The fix is a folder rule: `views/` components read models and must be observers; `ui/` components take plain values and can't import models.
4. **`fromResource` warns on reads outside a reaction.** The query adapter uses `createAtom` instead, with the same subscribe-while-observed behavior and no warning.
5. **The adapter shouldn't carry the query key in its type.** Otherwise `ObservableQuery<Board, ["board", string]>` isn't assignable to `ObservableQuery<Board>`. It stores only the two observer methods it uses.
6. **The persister writes at most once a second.** A change made in the last second before quitting may not be saved.
