import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShredStreamClient } from "./client.js";
import { defaultShredStreamConfig } from "./config.js";

type TransportProbe = {
  streamOnce: (_queue: unknown, signal: AbortSignal) => Promise<void>;
  ServiceClient: unknown;
};
function createClient(delay = 1000) {
  return Reflect.construct(ShredStreamClient, ["http://localhost:1", {
    ...defaultShredStreamConfig(), reconnect_delay_ms: delay,
  }]) as ShredStreamClient;
}
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("ShredStream lifecycle ownership", () => {
  it("serializes concurrent subscribers and stops every owned loop", async () => {
    const client = createClient();
    const signals: AbortSignal[] = [];
    (client as unknown as TransportProbe).streamOnce = (_queue, signal) => new Promise(resolve => {
      signals.push(signal);
      signal.addEventListener("abort", () => resolve(), { once: true });
    });
    const [first, second] = await Promise.all([client.subscribe(), client.subscribe()]);
    expect(first).not.toBe(second);
    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
    await client.stop();
    expect(signals.every(signal => signal.aborted)).toBe(true);
    await client.stop();
    expect(signals).toHaveLength(2);
  });

  it("serializes stop queued between subscribe calls", async () => {
    const client = createClient();
    const signals: AbortSignal[] = [];
    (client as unknown as TransportProbe).streamOnce = (_queue, signal) => new Promise(resolve => {
      signals.push(signal);
      signal.addEventListener("abort", () => resolve(), { once: true });
    });
    await Promise.all([client.subscribe(), client.stop(), client.subscribe()]);
    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
    await client.stop();
    expect(signals.every(signal => signal.aborted)).toBe(true);
  });

  it("cancels 60-second reconnect backoff immediately", async () => {
    vi.useFakeTimers(); vi.spyOn(console, "error").mockImplementation(() => undefined);
    const client = createClient(60_000);
    const transport = vi.fn(async () => { throw new Error("offline reconnect failure"); });
    (client as unknown as TransportProbe).streamOnce = transport;
    await client.subscribe();
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(1);
    await client.stop();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("stops a transport that does not signal end after cancel", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const call = new EventEmitter() as EventEmitter & { cancel: ReturnType<typeof vi.fn> };
    call.cancel = vi.fn();
    const close = vi.fn();
    const client = createClient();
    (client as unknown as TransportProbe).ServiceClient = class {
      subscribeEntries() { return call; }
      close() { close(); }
    };
    await client.subscribe();
    await client.stop();
    expect(call.cancel).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });
});

it.each([undefined, "  ", "  test-token  "])("sends optional x-token on each subscription: %s", async token => {
  const client = Reflect.construct(ShredStreamClient, ["http://localhost:1", {...defaultShredStreamConfig(), auth_token:token}]) as ShredStreamClient;
  const sent: unknown[] = [];
  (client as unknown as TransportProbe).ServiceClient = class {
    subscribeEntries(_request: unknown, metadata: {get(key:string):unknown}) {
      sent.push(metadata.get("x-token"));
      return Object.assign(new EventEmitter(), {cancel() {}});
    }
    close() {}
  };
  await client.subscribe(); await client.subscribe(); await client.stop();
  expect(sent).toEqual([token?.trim() ? ["test-token"] : [], token?.trim() ? ["test-token"] : []]);
});
it("rejects invalid x-token without exposing it", async () => {
  await expect(ShredStreamClient.connectWithConfig("http://localhost:1", {...defaultShredStreamConfig(), auth_token:"secret\nbad"}))
    .rejects.toThrow("Invalid x-token metadata");
});
