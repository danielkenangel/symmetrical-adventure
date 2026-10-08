/** One call in a batched IPC message, and its result. */
export interface BatchCall {
  method: string;
  args: unknown[];
}

export type BatchResult = { ok: true; value: unknown } | { ok: false; error: string };
