export interface SettingsStoreOptions {
  coalesceMs?: number;
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
  private pendingValue: T | undefined;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private waiters: Waiter[] = [];
  private writeChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly writer: (value: T) => Promise<void>,
    options: SettingsStoreOptions = {},
  ) {
    this.coalesceMs = options.coalesceMs ?? 200;
  }

  schedule(value: T): Promise<void> {
    this.pendingValue = value;
    if (this.timer !== null) clearTimeout(this.timer);

    const completion = new Promise<void>((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flushPending();
    }, this.coalesceMs);
    return completion;
  }

  flush(value?: T): Promise<void> {
    if (value !== undefined) this.pendingValue = value;
    if (this.timer !== null) {
      clearTimeout(this.timer);
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
