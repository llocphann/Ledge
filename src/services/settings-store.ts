export interface SettingsTimerHost {
  setTimeout(callback: () => void, delay: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface SettingsStoreOptions {
  coalesceMs?: number;
  timerHost?: SettingsTimerHost;
}

interface Waiter {
  resolve: () => void;
  reject: (error: unknown) => void;
}

/**
 * Serializes persistence writes and coalesces bursts of non-structural changes.
 * The latest scheduled snapshot wins, while explicit flushes remain immediate
 * and are always ordered after any write already in flight.
 */
export class SettingsStore<T> {
  private readonly coalesceMs: number;
  private readonly timerHost: SettingsTimerHost;
  private pendingValue: T | undefined;
  private timer: unknown | null = null;
  private waiters: Waiter[] = [];
  private writeChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly writer: (value: T) => Promise<void>,
    options: SettingsStoreOptions = {},
  ) {
    this.coalesceMs = options.coalesceMs ?? 200;
    this.timerHost = options.timerHost ?? {
      setTimeout: (callback, delay) => window.setTimeout(callback, delay),
      clearTimeout: (handle) => window.clearTimeout(handle as number),
    };
  }

  schedule(value: T): Promise<void> {
    this.pendingValue = value;
    if (this.timer !== null) this.timerHost.clearTimeout(this.timer);

    const completion = new Promise<void>((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
    this.timer = this.timerHost.setTimeout(() => {
      this.timer = null;
      void this.flushPending();
    }, this.coalesceMs);
    return completion;
  }

  flush(value?: T): Promise<void> {
    if (value !== undefined) this.pendingValue = value;
    if (this.timer !== null) {
      this.timerHost.clearTimeout(this.timer);
      this.timer = null;
    }
    return this.flushPending();
  }

  async settle(): Promise<void> {
    if (this.pendingValue !== undefined) await this.flushPending();
    await this.writeChain;
  }

  private flushPending(): Promise<void> {
    if (this.pendingValue === undefined) return this.writeChain;

    const value = this.pendingValue;
    const waiters = this.waiters;
    this.pendingValue = undefined;
    this.waiters = [];

    const write = this.writeChain.then(() => this.writer(value));
    // Keep the serialization chain usable after a failed write while still
    // surfacing the failure to callers waiting for this particular snapshot.
    this.writeChain = write.catch(() => undefined);
    void write.then(
      () => {
        for (const waiter of waiters) waiter.resolve();
      },
      (error: unknown) => {
        for (const waiter of waiters) waiter.reject(error);
      },
    );
    return write;
  }
}
