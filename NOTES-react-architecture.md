# Architecture notes: React-first state (greenfield)

Decisions from the state-management review, written down before the rebuild so they don't slip. The target is a greenfield codebase that becomes bezi-next. The MobX version of this demo stays on `main` for comparison; the rebuild happens in a separate worktree.

Stack: React with the React Compiler, TanStack Query for server data, vanilla Zustand stores for client and stream state, feature folders and the import manifest from RFC 1.

## Why we moved off MobX

The MobX version worked, but most of the effort went into **lifetimes**, not features:

- A model holds a query subscription, so its identity matters. Throwaway models resubscribed on every computed re-run, and TanStack treats a subscription as a mount: every move refetched the boards and every filter keystroke refetched every card.
- Long-lived models outlived their cache entries. After `gcTime`, a model reattached to the dropped entry and showed stale data forever. The fix (options as a function) relied on a library internal.
- Fixing both needed a new primitive (models that live only while observed), timing parameters that must agree (release delay below every `gcTime`), and client state split away from the models.

React already owns observation lifetime: a component is mounted or it isn't. TanStack Query's observer-per-mount model is built for it. Using both as intended removes that whole class of bug.

What MobX gave us that we still want is shared derivation with fine-grained updates. We get it by hoisting memoized derivations into providers at the right scope, selecting the smallest slice in the leafiest component, and letting the compiler memoize. That's fine-grained at the level of contexts and selectors, not individual fields, which is enough when the rules below are followed.

## The two layers

```
core/  (per feature)   plain TypeScript, no React
  stores               defineStore (platform/core/defineStore.ts), Zustand underneath
  services             daemon client, stream reducers, sync, connections
  queries, mutations   option factories; the QueryClient itself
  derive functions     pure
  subscriptions        "when X changes, do Y", owned by a scope with dispose()

views/ hooks/ (per feature)   React
  providers            put scope and handles into context
  hooks                select from stores and queries; the feature's public React API
  components           read the smallest slice, as deep in the tree as possible
```

**React depends on the core, never the reverse.** The core never imports React, never reads a value React computed, and never waits on a component. React subscribes to the core and sends intents into it. dependency-cruiser enforces that `core/` imports nothing from `react` or from any `views/` or `hooks/` folder.

## Rules

1. **React pushes intents, not values.** Components call actions (`actions.moveCard(...)`) and report view lifecycle ("thread X is visible"). A component never writes a value it computed into a store. That's a side channel synced by an effect, stale for a render after every change (bezi-next's `publishAvailability`).
2. **Anything non-React code needs is computed in the core.** Not computed in a component and then published.
3. **A derived value is stored only if one writer owns it.** The reducer or action that writes the inputs writes the derived field in the same step, so it can't drift. A derived field kept in sync by several actions is the stored-flags problem; use a memoized core selector instead.
4. **Cheap derivations are just functions.** Call them where needed; the compiler memoizes them in components. Only expensive ones need storing (rule 3) or a memoized core selector.
5. **Contexts carry scope and handles, rarely data.** A context holds a board ID, a thread's store instance, a feature's service. These rarely change, so consumers rarely re-render because of the context. A large, often-changing value in context re-renders every consumer whatever they read, so don't put one there.
6. **Read in the leafiest component, and pass IDs, not data.** Lists pass IDs (`<CardTile cardId={id} />`); the leaf resolves its own data with a hook. Prop drilling is kept to a minimum: data is never passed down more than one level just to reach a reader.
7. **A feature's contexts are private; its hooks are its API.** To read a feature's data, import its hook from its `index.ts`. The import graph is the dependency graph, checked against `architecture.mjs` as in RFC 1.
8. **Provider nesting follows build order.** A provider reads only contexts above it, so the provider tree is a composition root and can't express a cycle.
9. **"When X changes, do Y" lives in the core.** It's a store or query-cache subscription, owned by a core scope and disposed with it. Effects in components are only for UI work: focus, scrolling, measuring, imperative DOM.
10. **Server data uses TanStack Query as intended.** `useQuery` in hooks, one observer per mounted reader. Normalization stays: the owner of an entity type upserts entities found in other responses, and readers resolve them by ID (`useCardQuery(id)`). A hook that reads the query cache, directly or through another such hook, ends in `Query` and returns the query result (`const { data: name } = useBoardNameQuery(boardId)`); one that reads the mutation cache ends in `Mutation`. So a call site shows which values are server data that can be pending or failed. Query options are made with `defineQuery` (`platform/core/defineQuery.ts`), whose `queryFn` must return JSON-safe data: structural sharing only reuses plain objects and arrays, and persisted queries go through JSON.
11. **Writes are core functions.** One function runs the mutation and the client-side effects together. It works the same from a click or from non-React code. The UI reads pending and error state by mutation key.
12. **The compiler's ESLint plugin is an error, not a warning.** A component the compiler bails out on falls back to plain re-renders without any visible sign, so lint must catch it.
13. **Components rendered from a list are wrapped in `memo`.** The compiler memoizes elements built in a component's body, but not the ones built in a `.map`, so without `memo` every row re-renders whenever the list does. Measured in the demo's chat: 136 line renders per update without it, one render per changed message with it. This is the one place memoization is written by hand.

## Patterns

### A core store

Every store is made with `defineStore` (`platform/core/defineStore.ts`), called in the feature's factory so each composed app has its own instance. State changes only through named actions; each write carries a label, shown in Redux DevTools as `boards/setFilter`. Actions return nothing: reads are `read` (non-React) or a hook from `selectFrom` (React).

```ts
// features/boards/core/boards.ts
export function createBoards(deps: BoardsDeps) {
  const store = defineStore({
    name: "boards",
    initialState: { filters: {} } as BoardsState,
    actions: (set) => ({
      // The label is explicit, so a write after an await is still named correctly.
      setFilter: (boardId: string, filter: string) => set("setFilter", (s) => ({ filters: { ...s.filters, [boardId]: filter } })),
    }),
  });
  const actions = { ...store.actions, moveCard, createCard, setWipLimit }; // store writes and mutations alike
  return { queries, store, actions, start };
}
```

A store has no `setState`: TypeScript, not lint, keeps writes inside its actions. The zustand store behind it is reachable only through the `STORE` symbol, which only `platform/react/select.ts` may import. `devtools: false` opts a hot store out of DevTools serialization.

### Subscriptions in the core (reactions, without React)

Every subscription returns an unsubscribe, which goes into the owning scope's `Disposer`.

```ts
// A store field changed: save it. watch calls back only when the selection changes.
disposer.add(
  boards.store.watch(
    (s) => s.filters,
    (filters) => storage.setItem("filters", JSON.stringify(filters)),
  ),
);

// Several fields: a tuple, compared shallowly. fireImmediately runs it once on start.
disposer.add(
  navigation.store.watch(
    (s) => [s.view, s.boardId] as const,
    ([view, boardId]) => storage.setItem("location", JSON.stringify({ view, boardId })),
    { fireImmediately: true },
  ),
);

// A cache entry changed: react to server data without a component.
disposer.add(
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === "updated" && event.query.queryKey[0] === "board") onBoardChanged(event.query.state.data);
  }),
);

// A push from the server: write into the cache, never into a component.
disposer.add(
  api.onCardChanged(({ boardId, card }) => {
    cards.upsert([card], Date.now());
    queryClient.setQueryData(boardKeys.board(boardId), (b) => b && withCardPlaced(b, card));
  }),
);
```

### Reading from non-React code

```ts
const filterOf = boards.store.read((s, boardId: string) => s.filters[boardId] ?? ""); // client state: a reader
const filter = filterOf(boardId);
const cached = queryClient.getQueryData(boardKeys.board(boardId)); // server data, if cached
const board = await queryClient.query(boardQueries.board(boardId)); // server data, fetched if missing or stale
```

### Reading from React: handle in context, slice in the leaf

```ts
// features/boards/hooks.ts: the feature context holds the core, which never changes
const [BoardsProvider, useBoards] = createFeatureContext<Boards>("boards");

// selectFrom (platform/react/select.ts) turns selectors into named hooks over the store.
// Results are compared shallowly: return a primitive, a stored reference, or a flat pick.
function useBoardsStore() {
  return useBoards().store;
}
const select = selectFrom(useBoardsStore);

export const useBoardFilter = select((s, boardId: string) => s.filters[boardId] ?? "");
export function useBoardActions() {
  return useBoards().actions; // views reach the writes, never the store
}
```

Every hook is named and exported; components never pass a selector. `useBoardsStore` is a named `use*` function because the hook rules reject a hook called from an anonymous arrow.

```tsx
// Lists pass IDs; the leaf resolves its own data.
function Column({ boardId, column }: { boardId: string; column: Column }) {
  const cardIds = useColumnQuery(boardId, column).data?.cardIds ?? [];
  return cardIds.map((id) => <CardTile key={id} cardId={id} />);
}

function CardTile({ cardId }: { cardId: string }) {
  const card = useCardQuery(cardId).data; // one cache entry; re-renders only when this card changes
  return <div className="card">{card?.title}</div>;
}
```

### A shared derivation, computed once per scope

```tsx
// Hoisted to the provider that owns the scope, so every reader shares one result.
// The compiler memoizes deriveColumns on (board, filter); no hand-written useMemo.
export function BoardProvider({ boardId, children }: { boardId: string; children: ReactNode }) {
  const board = useQuery(boardQueries.board(boardId)).data;
  const filter = useBoardFilter(boardId);
  const columns = deriveColumns(board, filter);
  return <ColumnsContext value={columns}>{children}</ColumnsContext>;
}
```

Use this only when the value is small or changes rarely (rule 5). For a large or fast-changing value, put it behind a store and let leaves select from it.

### Writes: one core function, status by key

```ts
// platform/core/mutations.ts: run a mutation from anywhere, through the mutation cache
export async function runMutation(queryClient, options, variables): Promise<void> {
  const observer = new MutationObserver(queryClient, options);
  try {
    await observer.mutate(variables);
  } catch {
    // The error stays on the mutation; the UI reads it by key.
  } finally {
    observer.reset(); // detach, so the finished mutation is garbage-collected after its gcTime
  }
}

// features/boards/core/boards.ts: callable from a click handler or from non-React code.
// Client-side effects of the write go in this same function.
moveCard(boardId: string, cardId: string, column: Column): Promise<void> {
  return runMutation(deps.queryClient, moveCardOptions({ ...deps, boardId }), { cardId, column });
},

// features/boards/hooks.ts: a leaf reads status by key, not by holding the mutation
export function usePendingCardsMutation(boardId: string) {
  return useMutationState({
    filters: { mutationKey: boardKeys.create(boardId), status: "pending" },
    select: (mutation) => ({ id: mutation.mutationId, title: mutation.state.variables as string }),
  });
}
```

Settled in the rebuild: a `MutationObserver` per call, detached when it settles. Pending input and the latest error are read with `useMutationState` by key, so a write started outside React shows up the same way.

### A store per key: dynamic scopes

A thread's expanded groups, its panel history, where it was scrolled to: client state that belongs to one thread, lives only for this app instance, and should still be there after switching to another thread and back.

Each mounted view gets its own store, which is authoritative while it's mounted. It starts from a snapshot of where that key left off and copies its state back on every change. The snapshots are plain data in an LRU (`createSnapshotCache`, `platform/core/snapshotCache.ts`), owned by the feature's core and made in its factory like any store, so a recompose (a profile or workspace switch) drops them.

```ts
// features/threads/core/threads.ts
const uiSnapshots = createSnapshotCache<ThreadUiState>({ max: 50 }); // the oldest past this starts fresh next time
```

```tsx
// features/threads/hooks.ts
const [ThreadUiProvider, useThreadUi] = createScopedContext({
  name: "thread-ui",
  initialState: { expanded: {}, history: [] } as ThreadUiState,
  actions: (set) => ({
    toggle: (groupId: string) => set("toggle", (s) => ({ expanded: { ...s.expanded, [groupId]: !s.expanded[groupId] } })),
  }),
});
const select = selectFrom(useThreadUi);
export const useGroupExpanded = select((s, groupId: string) => s.expanded[groupId] ?? false);

// features/threads/views/ThreadView.tsx: keyed, because the store is made once per mount
return (
  <ThreadUiProvider key={threadId} id={threadId} snapshots={threads.uiSnapshots}>
    <ThreadBody />
  </ThreadUiProvider>
);
```

Saving is an effect, but a pure side effect: nothing subscribes to the cache, so it can't re-render anything, and nothing reads it while the key is mounted. The trade-offs:

- Non-React code sees only the last snapshot, not the live state. If a core subscription needs a thread's UI state while it's mounted, this pattern doesn't fit.
- Two mounts of one key (a thread in the main view and a panel) have separate stores; the cache keeps whichever saved last.
- Mounted keys save too, so they count toward `max`.

A connection or service scope (a host, its daemon client) is not this: it's a core-owned registry with its own lifecycle, not UI state, and gets no LRU.

### High-frequency streams

The stream lives entirely in the core. React selects per leaf.

```ts
// features/chat/core/chat.ts: one store per room
function createRoom(boardId: string) {
  const store = defineStore({
    name: `chat/${boardId}`,
    initialState: EMPTY_CHAT as ChatState,
    devtools: false, // a hot path: up to one write per frame
    actions: (set) => ({
      apply: (events: ChatEvent[]) => set("apply", (s) => reduce(s, events)), // pure; unchanged messages keep their identity
    }),
  });
  let queue: ChatEvent[] = [];
  let cancel: (() => void) | null = null;
  const flush = () => {
    cancel = null;
    const events = queue;
    queue = [];
    store.actions.apply(events);
  };
  return {
    store,
    push(event: ChatEvent) {
      queue.push(event);
      // At most one update per frame, however fast events arrive. onNextFrame falls back to a timer,
      // because a hidden window gets no animation frames.
      cancel ??= onNextFrame(flush);
    },
  };
}
```

```tsx
// features/chat/hooks.ts: the room comes from the panel's context
const select = selectFrom(useRoom);
export const useMessageIds = select((s) => s.messageIds); // re-renders when messages are added, not edited
export const useMessage = select((s, messageId: string) => s.messages[messageId]); // only when this message changes

// The list selects only IDs; each row selects only its message.
function ChatLog() {
  const ids = useMessageIds();
  return ids.map((id) => <ChatLine key={id} messageId={id} />);
}

// memo: a list row (rule 13). Without it, every line re-renders whenever the log does.
const ChatLine = memo(function ChatLine({ messageId }: { messageId: string }) {
  const message = useMessage(messageId);
  return (
    <div className="chat-line">
      <b>{message.author}</b> {message.text}
    </div>
  );
});
```

Measured while building the demo, with temporary render counters (since removed), as the fake server streamed chat at 300 events per second for two seconds: 549 events applied in about 210 updates (one per frame, on a 120 Hz display); the log rendered about 190 times (it skips updates that only add hype); lines rendered 536 times, one per changed message. Re-measured after moving to `defineStore`: 549 events in 232 updates, 542 line renders; one card move still renders 2 columns and 1 card.

## Enforcement

| Rule                                                                                                                | Tool                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `core/` imports no React packages                                                                                   | ESLint `no-restricted-imports` on `core/` folders                                                                             |
| Only `platform/core/defineStore.ts` and `platform/react/select.ts` import zustand; only `select.ts` imports `STORE` | ESLint `no-restricted-imports` on every file                                                                                  |
| Store writes go through actions                                                                                     | TypeScript: a defined store has no `setState`                                                                                 |
| A feature's core uses only other features' cores (`core/index.ts`) and the platform core                            | dependency-cruiser `core-uses-cores`                                                                                          |
| Every subscription's unsubscribe is kept (`subscribe`, `watch`)                                                     | ESLint `no-restricted-syntax` on `core/` folders                                                                              |
| Hooks that read the query or mutation cache end in `Query` / `Mutation`                                             | ESLint `local/source-suffix` (`lint/rules/source-suffix.mjs`)                                                                 |
| Query data is JSON-safe; every query is made with `defineQuery`                                                     | TypeScript: `defineQuery` rejects non-JSON-safe data; ESLint `no-restricted-syntax` rejects a `queryFn` outside `defineQuery` |
| Features import only declared features, through `index.ts` or `core/index.ts`; no cycles                            | dependency-cruiser (`architecture.mjs`), carried over from RFC 1                                                              |
| Hook rules, dependencies, and every compiler rule                                                                   | `eslint-plugin-react-hooks` `recommended-latest`, with its warnings raised to errors                                          |
| Factories take the features they use, never the composed app                                                        | `local/no-app-deps`, carried over                                                                                             |

Candidates to try: a rule against store setters or `setQueryData` inside `useEffect` (rule 1), and a rule that context values are stores, IDs or services (rule 5). Both are probably heuristics, not hard checks.

## Open questions

- Where per-entity hooks get their scope when an entity type is shared across features (profiles in threads, members and comments). Likely `useProfile(id)` from the profiles feature, read anywhere it's declared as a dependency.
