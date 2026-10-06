import { QueryClient } from "@tanstack/react-query";
import { autorun, configure, runInAction, when } from "mobx";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Board } from "../../../shared/api";
import { AppRoot, LOCATION_STORAGE_KEY } from "../app/AppRoot";
import { startLiveUpdates } from "../app/liveUpdates";
import { withCardMoved } from "../data/boardUpdates";
import { createQueries, keys } from "../data/queries";
import { BUGS, createFakeApi, LAUNCH } from "../testing/fakeApi";
import { AppLocation } from "./AppLocation";
import { Session } from "./Session";

// The same strict mode the app runs with in development, and any MobX warning fails the test.
configure({ enforceActions: "always", computedRequiresReaction: true, reactionRequiresObservable: true });
let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn");
});
afterEach(() => {
  expect(warn).not.toHaveBeenCalled();
  warn.mockRestore();
});

function setup(boards: Board[] = [LAUNCH, BUGS]) {
  const fake = createFakeApi(boards);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const location = new AppLocation();
  const session = new Session({ queryClient, queries: createQueries(fake.api), location });
  return { ...fake, queryClient, location, session };
}

/** Keeps `read` observed (as a mounted component would) and counts how often it re-runs. */
function track(read: () => unknown) {
  const tracker = { runs: 0, stop: () => {} };
  tracker.stop = autorun(() => {
    read();
    tracker.runs++;
  });
  return tracker;
}

async function loaded(session: Session, boardId: string) {
  const board = session.board(boardId);
  await when(() => !board.isLoading);
  return board;
}

describe("derived state", () => {
  test("the board derives counts and columns from the cache", async () => {
    const { session } = setup();
    const board = session.board("launch");
    const view = track(() => [board.todoCount, board.column("todo"), board.column("doing")]);
    await loaded(session, "launch");

    expect(board.todoCount).toBe(2);
    expect(board.column("todo").cardIds).toEqual(["c1", "c2"]);
    expect(board.column("doing")).toMatchObject({ total: 1, limit: 2, overLimit: false });
    view.stop();
  });

  test("a write to the cache flows through every derivation at once", async () => {
    const { session, queryClient } = setup();
    const board = session.board("launch");
    const view = track(() => [board.todoCount, board.column("doing")]);
    await loaded(session, "launch");

    // Exactly what an optimistic move does: change the cache, not the model.
    queryClient.setQueryData<Board>(keys.board("launch"), (data) => data && withCardMoved(data, "c1", "doing"));
    queryClient.setQueryData<Board>(keys.board("launch"), (data) => data && withCardMoved(data, "c2", "doing"));

    expect(board.todoCount).toBe(0);
    expect(board.column("doing")).toMatchObject({ total: 3, limit: 2, overLimit: true });
    view.stop();
  });

  test("the filter is client state and only narrows what's visible", async () => {
    const { session } = setup();
    const board = session.board("launch");
    const view = track(() => board.column("todo"));
    await loaded(session, "launch");

    board.setFilterAction("demo");
    expect(board.column("todo")).toMatchObject({ cardIds: ["c2"], total: 2 });
    view.stop();
  });
});

describe("caching", () => {
  test("a refetch that returns equal data re-runs nothing", async () => {
    const { session, queryClient, calls } = setup();
    const board = session.board("launch");
    const column = track(() => board.column("todo"));
    const badge = track(() => board.todoCount);
    await loaded(session, "launch");
    const before = { column: column.runs, badge: badge.runs, view: board.column("todo") };

    await queryClient.refetchQueries({ queryKey: keys.board("launch") });

    expect(calls.filter((call) => call === "getBoard launch")).toHaveLength(2);
    expect(column.runs).toBe(before.column);
    expect(badge.runs).toBe(before.badge);
    expect(board.column("todo")).toBe(before.view);
    column.stop();
    badge.stop();
  });

  test("a live change gives only the changed card a new object", async () => {
    const { session, queryClient, api, pushChange } = setup();
    const stopLive = startLiveUpdates({ api, queryClient });
    const board = session.board("launch");
    const view = track(() => board.cardById);
    await loaded(session, "launch");
    const [c1, c2] = [board.card("c1"), board.card("c2")];

    pushChange({ boardId: "launch", card: { ...LAUNCH.cards[0]!, column: "done", rank: 1 } });

    expect(board.card("c1")?.column).toBe("done");
    expect(board.card("c1")).not.toBe(c1);
    expect(board.card("c2")).toBe(c2);
    view.stop();
    stopLive();
  });

  test("a query is subscribed only while something reads it, and the data stays cached", async () => {
    const { session, queryClient } = setup();
    const board = session.board("launch");
    const query = () => queryClient.getQueryCache().find({ queryKey: keys.board("launch") })!;

    const view = track(() => board.todoCount);
    await loaded(session, "launch");
    expect(query().getObserversCount()).toBe(1);

    view.stop();
    expect(query().getObserversCount()).toBe(0);
    expect(queryClient.getQueryData(keys.board("launch"))).toBeDefined();

    // Reading again resumes from the cache: no loading state.
    const again = track(() => board.isLoading);
    expect(board.isLoading).toBe(false);
    again.stop();
  });
});

describe("where models live", () => {
  test("one model per board, so client state survives switching boards", async () => {
    const { session, location } = setup();
    const current = track(() => session.currentBoard?.filter);
    await when(() => session.currentBoard !== null);

    const launch = session.board("launch");
    launch.setFilterAction("press");
    location.showBoardAction("bugs");
    expect(session.currentBoard).toBe(session.board("bugs"));
    location.showBoardAction("launch");

    expect(session.currentBoard).toBe(launch);
    expect(launch.filter).toBe("press");
    current.stop();
  });

  test("the app root owns the reactions that must always run", async () => {
    const fake = createFakeApi([LAUNCH, BUGS]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const storage = new Map<string, string>();
    const titles: string[] = [];
    const root = new AppRoot({
      api: fake.api,
      queryClient,
      storage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => void storage.set(key, value) },
      setTitle: (title) => titles.push(title),
    });

    // The title follows the derived TODO count, including other people's changes.
    await when(() => root.session.currentBoard?.isLoading === false);
    expect(titles.at(-1)).toBe("Launch (2 to do)");
    fake.pushChange({ boardId: "launch", card: { ...LAUNCH.cards[0]!, column: "done", rank: 1 } });
    expect(titles.at(-1)).toBe("Launch (1 to do)");

    // Location is client state, saved on change.
    runInAction(() => root.location.showSettingsAction());
    expect(JSON.parse(storage.get(LOCATION_STORAGE_KEY)!)).toMatchObject({ view: "settings" });

    // One dispose stops everything the root owns.
    expect(fake.listenerCount()).toBe(1);
    root.dispose();
    expect(fake.listenerCount()).toBe(0);
  });
});
