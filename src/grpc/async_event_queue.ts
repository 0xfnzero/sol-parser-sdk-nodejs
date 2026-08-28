export type EventQueueOverflowStrategy = "drop-newest" | "drop-oldest";

/** Internal O(1) queue used by the public async-iterable subscription. */
export class AsyncEventQueue<T> implements AsyncIterable<T>, AsyncIterator<T> {
  private readonly items: Array<T | undefined>;
  private readonly waiters: Array<(result: IteratorResult<T>) => void> = [];
  private closed = false;
  private droppedCount = 0;
  private head = 0;
  private size = 0;

  constructor(
    private readonly maxSize: number,
    private readonly overflowStrategy: EventQueueOverflowStrategy = "drop-newest"
  ) {
    if (!Number.isInteger(maxSize) || maxSize < 1) {
      throw new RangeError("AsyncEventQueue maxSize must be a positive integer");
    }
    this.items = new Array<T | undefined>(maxSize);
  }

  push(item: T): boolean {
    if (this.closed) return false;
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter({ value: item, done: false });
      return true;
    }
    if (this.size < this.maxSize) {
      this.items[(this.head + this.size) % this.maxSize] = item;
      this.size++;
      return true;
    }
    this.droppedCount++;
    if (this.overflowStrategy === "drop-oldest") {
      this.items[this.head] = item;
      this.head = (this.head + 1) % this.maxSize;
    }
    return false;
  }

  len(): number {
    return this.size;
  }

  dropped(): number {
    return this.droppedCount;
  }

  /** Synchronous O(1) dequeue for internal scheduled consumers. */
  shift(): T | undefined {
    if (this.size === 0) return undefined;
    const item = this.items[this.head] as T;
    this.items[this.head] = undefined;
    this.head = (this.head + 1) % this.maxSize;
    this.size--;
    return item;
  }

  clear(): void {
    while (this.size > 0) this.shift();
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const waiter of this.waiters.splice(0)) {
      waiter({ value: undefined, done: true });
    }
  }

  next(): Promise<IteratorResult<T>> {
    if (this.size > 0) {
      return Promise.resolve({ value: this.shift() as T, done: false });
    }
    if (this.closed) {
      return Promise.resolve({ value: undefined, done: true });
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return this;
  }
}
