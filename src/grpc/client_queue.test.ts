import { describe, expect, it } from "vitest";
import { AsyncEventQueue } from "./async_event_queue.js";

async function drain<T>(queue: AsyncEventQueue<T>): Promise<T[]> {
  queue.close();
  const values: T[] = [];
  for await (const value of queue) values.push(value);
  return values;
}

describe("AsyncEventQueue", () => {
  it("preserves FIFO order when the ring wraps", async () => {
    const queue = new AsyncEventQueue<number>(3);

    expect(queue.push(1)).toBe(true);
    expect(queue.push(2)).toBe(true);
    expect(queue.push(3)).toBe(true);
    expect((await queue.next()).value).toBe(1);
    expect(queue.push(4)).toBe(true);

    expect(queue.len()).toBe(3);
    expect(await drain(queue)).toEqual([2, 3, 4]);
  });

  it("keeps existing events with the compatible drop-newest strategy", async () => {
    const queue = new AsyncEventQueue<number>(2, "drop-newest");

    queue.push(1);
    queue.push(2);
    expect(queue.push(3)).toBe(false);

    expect(queue.dropped()).toBe(1);
    expect(await drain(queue)).toEqual([1, 2]);
  });

  it("keeps the freshest events with the low-latency drop-oldest strategy", async () => {
    const queue = new AsyncEventQueue<number>(2, "drop-oldest");

    queue.push(1);
    queue.push(2);
    expect(queue.push(3)).toBe(false);
    expect(queue.push(4)).toBe(false);

    expect(queue.dropped()).toBe(2);
    expect(queue.len()).toBe(2);
    expect(await drain(queue)).toEqual([3, 4]);
  });

  it("delivers directly to a waiting consumer without buffering", async () => {
    const queue = new AsyncEventQueue<number>(1);
    const next = queue.next();

    expect(queue.push(7)).toBe(true);
    expect(await next).toEqual({ value: 7, done: false });
    expect(queue.len()).toBe(0);
  });

  it("rejects invalid capacities", () => {
    expect(() => new AsyncEventQueue<number>(0)).toThrow(RangeError);
    expect(() => new AsyncEventQueue<number>(1.5)).toThrow(RangeError);
  });
});
