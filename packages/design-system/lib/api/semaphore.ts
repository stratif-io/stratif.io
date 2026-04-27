export const MAX_CONCURRENT_QUERIES = 5;
export const IDLE_DISMISS_DELAY_MS = 3000;

/**
 * Detect whether an error thrown during a semaphore-tagged fetch is a timeout
 * abort (see `fetchWithSemaphore`). This covers both the `DOMException` we
 * raise via `controller.abort(new DOMException('Query timeout', 'TimeoutError'))`
 * and the generic `AbortError` some environments surface when a fetch is
 * cancelled via signal without a reason.
 */
export function isTimeoutError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: unknown }).name;
  return name === "TimeoutError" || name === "AbortError";
}

type CountChangeCallback = (running: number, queued: number) => void;

export type QueryMeta = {
  id?: string;
  cardName: string;
  querySnippet: string;
  /** Lookup/dimension-value queries — shown only when the "show auxiliary" toggle is on. */
  auxiliary?: boolean;
};
export type TaskOpts = {
  groupKey?: string;
  timeoutMs?: number;
  meta?: QueryMeta;
};

type TaskStartCallback = (id: string, meta: QueryMeta) => void;
type TaskFinishCallback = (id: string, status: "done" | "failed") => void;

type SemaphoreHooks = {
  onTaskStart?: TaskStartCallback;
  onTaskFinish?: TaskFinishCallback;
};

type InitOpts = {
  onCountChange: CountChangeCallback;
  onTaskStart?: TaskStartCallback;
  onTaskFinish?: TaskFinishCallback;
};

type QueueEntry = { resolve: () => void; groupKey?: string };

export class QuerySemaphore {
  private running = 0;
  private queue: QueueEntry[] = [];
  private activeGroups = new Map<string, number>();
  private _max: number;
  private readonly onCountChange: CountChangeCallback;
  private readonly onTaskStart?: TaskStartCallback;
  private readonly onTaskFinish?: TaskFinishCallback;

  constructor(
    max: number,
    onCountChange: CountChangeCallback,
    hooks?: SemaphoreHooks,
  ) {
    this._max = max;
    this.onCountChange = onCountChange;
    this.onTaskStart = hooks?.onTaskStart;
    this.onTaskFinish = hooks?.onTaskFinish;
  }

  setMax(n: number): void {
    this._max = Math.max(1, n);
    while (this.running < this._max && this.queue.length > 0)
      this.dispatchNext();
    this.onCountChange(this.running, this.queue.length);
  }

  async run<T>(
    task: (signal?: AbortSignal) => Promise<T>,
    opts?: TaskOpts,
  ): Promise<T> {
    const groupKey = opts?.groupKey;

    if (this.running < this._max) {
      this.running++;
      if (groupKey) this.incGroup(groupKey);
      this.onCountChange(this.running, this.queue.length);
    } else {
      await new Promise<void>((resolve) => {
        this.queue.push({ resolve, groupKey });
        this.onCountChange(this.running, this.queue.length);
      });
      // Slot already accounted for by dispatcher (running++ and group inc done there).
    }

    const controller = opts?.timeoutMs ? new AbortController() : undefined;
    const timer = opts?.timeoutMs
      ? setTimeout(
          () =>
            controller!.abort(
              new DOMException("Query timeout", "TimeoutError"),
            ),
          opts.timeoutMs,
        )
      : undefined;

    const meta = opts?.meta;
    const taskId = meta ? (meta.id ?? crypto.randomUUID()) : undefined;
    if (meta && taskId) this.onTaskStart?.(taskId, meta);

    let status: "done" | "failed" = "done";
    try {
      return await task(controller?.signal);
    } catch (err) {
      status = "failed";
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
      if (meta && taskId) this.onTaskFinish?.(taskId, status);
      this.running--;
      // Dispatch BEFORE decrementing the finishing task's group so a queued task
      // with the same groupKey is preferred over an unrelated FIFO head.
      this.dispatchNext();
      if (groupKey) this.decGroup(groupKey);
      this.onCountChange(this.running, this.queue.length);
    }
  }

  private incGroup(key: string): void {
    this.activeGroups.set(key, (this.activeGroups.get(key) ?? 0) + 1);
  }

  private decGroup(key: string): void {
    const n = (this.activeGroups.get(key) ?? 0) - 1;
    if (n <= 0) this.activeGroups.delete(key);
    else this.activeGroups.set(key, n);
  }

  private dispatchNext(): void {
    if (this.queue.length === 0) return;
    if (this.running >= this._max) return;

    // Prefer a queued task whose groupKey matches a currently-running group.
    let idx = -1;
    for (let i = 0; i < this.queue.length; i++) {
      const g = this.queue[i].groupKey;
      if (g && this.activeGroups.has(g)) {
        idx = i;
        break;
      }
    }
    if (idx === -1) idx = 0;

    const [entry] = this.queue.splice(idx, 1);
    this.running++;
    if (entry.groupKey) this.incGroup(entry.groupKey);
    entry.resolve();
  }
}

let _semaphore: QuerySemaphore | null = null;

export function getSemaphore(): QuerySemaphore {
  if (!_semaphore) {
    throw new Error(
      "QuerySemaphore not initialized. Call initSemaphore() first.",
    );
  }
  return _semaphore;
}

export function initSemaphore(opts: CountChangeCallback | InitOpts): void {
  if (typeof opts === "function") {
    _semaphore = new QuerySemaphore(MAX_CONCURRENT_QUERIES, opts);
  } else {
    _semaphore = new QuerySemaphore(
      MAX_CONCURRENT_QUERIES,
      opts.onCountChange,
      {
        onTaskStart: opts.onTaskStart,
        onTaskFinish: opts.onTaskFinish,
      },
    );
  }
}

export async function fetchWithSemaphore(
  input: RequestInfo | URL,
  init?: RequestInit,
  opts?: TaskOpts,
): Promise<Response> {
  return getSemaphore().run(
    (signal) => fetch(input, { ...init, signal }),
    opts,
  );
}
