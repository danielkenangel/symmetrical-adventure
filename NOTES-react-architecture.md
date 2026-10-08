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
  stores               vanilla Zustand (createStore)
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

1. **React pushes intents, not values.** Components call actions (`store.getState().moveCard(...)`) and report view lifecycle ("thread X is visible"). A component never writes a value it computed into a store. That's a side channel synced by an effect, stale for a render after every change (bezi-next's `publishAvailability`).
2. **Anything non-React code needs is computed in the core.** Not computed in a component and then published.
3. **A derived value is stored only if one writer owns it.** The reducer or action that writes the inputs writes the derived field in the same step, so it can't drift. A derived field kept in sync by several actions is the stored-flags problem; use a memoized core selector instead.
4. **Cheap derivations are just functions.** Call them where needed; the compiler memoizes them in components. Only expensive ones need storing (rule 3) or a memoized core selector.
5. **Contexts carry scope and handles, rarely data.** A context holds a board ID, a thread's store instance, a feature's service. These rarely change, so consumers rarely re-render because of the context. A large, often-changing value in context re-renders every consumer whatever they read, so don't put one there.
6. **Read in the leafiest component, and pass IDs, not data.** Lists pass IDs (`<CardTile cardId={id} />`); the leaf resolves its own data with a hook. Prop drilling is kept to a minimum: data is never passed down more than one level just to reach a reader.
7. **A feature's contexts are private; its hooks are its API.** To read a feature's data, import its hook from its `index.ts`. The import graph is the dependency graph, checked against `architecture.mjs` as in RFC 1.
8. **Provider nesting follows build order.** A provider reads only contexts above it, so the provider tree is a composition root and can't express a cycle.
9. **"When X changes, do Y" lives in the core.** It's a store or query-cache subscription, owned by a core scope and disposed with it. Effects in components are only for UI work: focus, scrolling, measuring, imperative DOM.
10. **Server data uses TanStack Query as intended.** `useQuery` in hooks, one observer per mounted reader. Normalization stays: the owner of an entity type upserts entities found in other responses, and readers resolve them by ID (`useCard(id)`).
11. **Writes are core functions.** One function runs the mutation and the client-side effects together. It works the same from a click or from non-React code. The UI reads pending and error state by mutation key.
12. **The compiler's ESLint plugin is an error, not a warning.** A component the compiler bails out on falls back to plain re-renders without any visible sign, so lint must catch it.
13. **Components rendered from a list are wrapped in `memo`.** The compiler memoizes elements built in a component's body, but not the ones built in a `.map`, so without `memo` every row re-renders whenever the list does. Measured in the demo's chat: 136 line renders per update without it, one render per changed message with it. This is the one place memoization is written by hand.

## Patterns

### A core store

```ts
// features/boards/core/boardsStore.ts
import { createStore } from "zustand/vanilla";
import { subscribeWithSelector } from "zustand/middleware";

export interface BoardsState {
  filters: Record<string, string>;
  setFilter(boardId: string, filter: string): void;
}

export function createBoardsStore() {
  return createStore<BoardsState>()(
    subscribeWithSelector((set) => ({
      filters: {},
      setFilter: (boardId, filter) => set((s) => ({ filters: { ...s.filters, [boardId]: filter } })),
    })),
  );
}
export type BoardsStore = ReturnType<typeof createBoardsStore>;
```

### Subscriptions in the core (reactions, without React)

Every subscription returns an unsubscribe, which goes into the owning scope's `Disposer`.

```ts
// A store field changed: save it. subscribeWithSelector only calls back when the selection changes.
disposer.add(
  boards.subscribe(
    (s) => s.filters,
    (filters) => storage.setItem("filters", JSON.stringify(filters)),
  ),
);

// Several fields, compared shallowly, fired once on start.
disposer.add(
  shell.subscribe(
    (s) => [s.boardName, s.todoCount] as const,
    ([name, todo]) => setTitle(name ? `${name} (${todo} to do)` : "State demo"),
    { equalityFn: shallow, fireImmediately: true },
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
const filter = boardsStore.getState().filters[boardId] ?? "";       // client state: read directly
const cached = queryClient.getQueryData(boardKeys.board(boardId));  // server data, if cached
const board = await queryClient.ensureQueryData(boardQueries.board(boardId)); // server data, fetched if needed
```

### Reading from React: handle in context, slice in the leaf

```tsx
// features/boards/hooks/BoardsProvider.tsx: the context holds the store, which never changes
const BoardsContext = createContext<BoardsStore | null>(null);
export function BoardsProvider({ store, children }: { store: BoardsStore; children: ReactNode }) {
  return <BoardsContext value={store}>{children}</BoardsContext>;
}

// The hook selects the smallest slice. Only components whose slice changed re-render.
export function useBoardFilter(boardId: string): string {
  return useStore(use(BoardsContext)!, (s) => s.filters[boardId] ?? "");
}
```

```tsx
// Lists pass IDs; the leaf resolves its own data.
function Column({ boardId, column }: { boardId: string; column: Column }) {
  const cardIds = useColumnCardIds(boardId, column);
  return cardIds.map((id) => <CardTile key={id} cardId={id} />);
}

function CardTile({ cardId }: { cardId: string }) {
  const card = useCard(cardId); // one cache entry; re-renders only when this card changes
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
export function usePendingCards(boardId: string) {
  return useMutationState({
    filters: { mutationKey: boardKeys.create(boardId), status: "pending" },
    select: (mutation) => ({ id: mutation.mutationId, title: mutation.state.variables as string }),
  });
}
```

Settled in the rebuild: a `MutationObserver` per call, detached when it settles. Pending input and the latest error are read with `useMutationState` by key, so a write started outside React shows up the same way.

### High-frequency streams

The stream lives entirely in the core. React selects per leaf.

```ts
// features/chat/core/chatStore.ts: one store per stream
export function createChatStore(source: ChatSource) {
  const store = createStore<ChatState>()(subscribeWithSelector(() => emptyChat()));
  let queue: ChatEvent[] = [];
  let cancel: (() => void) | null = null;
  const flush = () => {
    cancel = null;
    const events = queue;
    queue = [];
    store.setState((s) => reduce(s, events)); // pure; unchanged messages keep their identity
  };
  const stop = source.subscribe((event) => {
    queue.push(event);
    // At most one update per frame, however fast events arrive. onNextFrame falls back to a timer,
    // because a hidden window gets no animation frames.
    cancel ??= onNextFrame(flush);
  });
  return { store, dispose: () => { stop(); cancel?.(); } };
}
```

```tsx
// The list selects only IDs; each row selects only its message.
function ChatLog() {
  const ids = useChat((s) => s.messageIds, shallow); // re-renders when messages are added, not edited
  return ids.map((id) => <ChatLine key={id} messageId={id} />);
}

// memo: a list row (rule 13). Without it, every line re-renders whenever the log does.
const ChatLine = memo(function ChatLine({ messageId }: { messageId: string }) {
  const message = useChat((s) => s.messages[messageId]); // re-renders only when this message changes
  return <div className="chat-line"><b>{message.author}</b> {message.text}</div>;
});

// useChat: Zustand's useStoreWithEqualityFn, which wraps useSyncExternalStoreWithSelector.
// bezi-next hand-rolls this; here it comes from the library.
export function useChat<T>(selector: (s: ChatState) => T, equality?: (a: T, b: T) => boolean): T {
  return useStoreWithEqualityFn(use(ChatContext)!, selector, equality);
}
```

Measured while building the demo, with temporary render counters (since removed), as the fake server streamed chat at 300 events per second for two seconds: 549 events applied in about 210 updates (one per frame, on a 120 Hz display); the log rendered about 190 times (it skips updates that only add hype); lines rendered 536 times, one per changed message.

## Enforcement

| Rule | Tool |
|---|---|
| `core/` imports no React packages | ESLint `no-restricted-imports` on `core/` folders |
| A feature's core uses only other features' cores (`core/index.ts`) and the platform core | dependency-cruiser `core-uses-cores` |
| Every subscription's unsubscribe is kept | ESLint `no-restricted-syntax` on `core/` folders |
| Features import only declared features, through `index.ts` or `core/index.ts`; no cycles | dependency-cruiser (`architecture.mjs`), carried over from RFC 1 |
| Hook rules, dependencies, and every compiler rule | `eslint-plugin-react-hooks` `recommended-latest`, with its warnings raised to errors |
| Factories take the features they use, never the composed app | `local/no-app-deps`, carried over |

Candidates to try: a rule against store setters or `setQueryData` inside `useEffect` (rule 1), and a rule that context values are stores, IDs or services (rule 5). Both are probably heuristics, not hard checks.

## Open questions

- Where per-entity hooks get their scope when an entity type is shared across features (profiles in threads, members and comments). Likely `useProfile(id)` from the profiles feature, read anywhere it's declared as a dependency.
- Whether `subscribeWithSelector` is enough for core reactions, or a small `select(store, selector, listener)` helper is clearer.
