import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { YellowstoneGrpc } from "./client.js";
import { defaultClientConfig } from "./types.js";

const parseMock = vi.hoisted(() => vi.fn());

vi.mock("./yellowstone_parse.js", () => ({
  parseDexEventsFromGrpcTransactionInfo: (...args: unknown[]) => {
    parseMock(...args);
    return [testEvent()];
  },
}));

function testEvent() {
  return {
    PumpFunTrade: {
      metadata: {
        signature: "test",
        slot: 10,
        tx_index: 0,
        block_time_us: 0,
        grpc_recv_us: 0,
      },
      mint: "",
      user: "",
      is_buy: true,
    },
  };
}

class FakeStream extends EventEmitter {
  cancelCalls = 0;
  writes: unknown[] = [];

  write(request: unknown, callback: (error?: Error | null) => void): boolean {
    this.writes.push(request);
    queueMicrotask(() => callback(null));
    return true;
  }

  cancel(): void {
    this.cancelCalls++;
    queueMicrotask(() => this.emit("error", new Error("cancelled")));
  }

  end(): void {}
}

class ImmediatelyFailingStream extends FakeStream {
  override write(_request: unknown, callback: (error?: Error | null) => void): boolean {
    queueMicrotask(() => {
      callback(null);
      queueMicrotask(() => this.emit("error", new Error("unhealthy stream")));
    });
    return true;
  }
}

class ReplayUnsupportedStream extends FakeStream {
  override write(request: { fromSlot?: string }, callback: (error?: Error | null) => void): boolean {
    this.writes.push(request);
    const error = Object.assign(new Error("from_slot is not supported"), { code: 12 });
    queueMicrotask(() => callback(error));
    return true;
  }
}

function clientWithStream(
  stream: FakeStream,
  orderMode: "Unordered" | "Ordered" = "Unordered",
  enableMetrics = false
) {
  const client = new YellowstoneGrpc("https://example.invalid", "", {
    ...defaultClientConfig(),
    order_mode: orderMode,
    enable_metrics: enableMetrics,
  });
  (client as unknown as { client: { subscribe: () => Promise<FakeStream> } }).client = {
    subscribe: async () => stream,
  };
  return client;
}

function clientWithStreams(streams: FakeStream[]) {
  const client = new YellowstoneGrpc("https://example.invalid", "", {
    ...defaultClientConfig(),
    retry_delay_ms: 1,
  });
  let index = 0;
  (client as unknown as { client: { subscribe: () => Promise<FakeStream> } }).client = {
    subscribe: async () => streams[index++]!,
  };
  return client;
}

function transactionUpdate(index = 0n, slot = 10n) {
  const signature = new Uint8Array(64);
  signature[0] = Number(index & 0xffn);
  return {
    transaction: {
      slot,
      transaction: {
        signature,
        isVote: false,
        transaction: {},
        meta: {},
        index,
      },
    },
  };
}

function nextTurn(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe("YellowstoneGrpc subscribeDexEvents lifecycle", () => {
  beforeEach(() => parseMock.mockClear());

  it("rejects invalid parser scheduling options", async () => {
    const client = clientWithStream(new FakeStream());

    await expect(
      client.subscribeDexEvents([], [], undefined, { parserBatchSize: Number.NaN })
    ).rejects.toThrow("parserBatchSize");
    await expect(
      client.subscribeDexEvents([], [], undefined, { ingressBufferSize: Number.POSITIVE_INFINITY })
    ).rejects.toThrow("ingressBufferSize");
    await expect(
      client.subscribeDexEvents([], [], undefined, { parserBatchSize: 1.5 })
    ).rejects.toThrow("parserBatchSize");
  });

  it("defers parsing so the gRPC data callback stays lightweight", async () => {
    const stream = new FakeStream();
    const sub = await clientWithStream(stream).subscribeDexEvents();
    await nextTurn();

    stream.emit("data", transactionUpdate());
    expect(parseMock).not.toHaveBeenCalled();

    await nextTurn();
    expect(parseMock).toHaveBeenCalledOnce();
    sub.cancel();
  });

  it("measures local queue and parser latency without an RPC call", async () => {
    const stream = new FakeStream();
    const sub = await clientWithStream(stream, "Unordered", true).subscribeDexEvents();
    await nextTurn();

    stream.emit("data", transactionUpdate());
    const result = await sub.next();
    expect(result.done).toBe(false);
    const metadata = (result.value as ReturnType<typeof testEvent>).PumpFunTrade.metadata;
    expect(metadata.local_queue_latency_us).toBeGreaterThanOrEqual(0);
    expect(metadata.parse_duration_us).toBeGreaterThanOrEqual(0);
    expect(metadata.local_processing_latency_us).toBeCloseTo(
      metadata.local_queue_latency_us + metadata.parse_duration_us,
      6
    );
    sub.cancel();
  });

  it("keeps the freshest raw updates and exposes ingress drops during a burst", async () => {
    const stream = new FakeStream();
    const sub = await clientWithStream(stream).subscribeDexEvents([], [], undefined, {
      ingressBufferSize: 2,
      parserBatchSize: 1,
      queueOverflowStrategy: "drop-oldest",
    });
    await nextTurn();

    stream.emit("data", transactionUpdate(1n));
    stream.emit("data", transactionUpdate(2n));
    stream.emit("data", transactionUpdate(3n));

    expect(sub.ingressLen()).toBe(2);
    expect(sub.ingressDropped()).toBe(1);
    expect(sub.dropped()).toBe(1);
    expect(parseMock).not.toHaveBeenCalled();

    await nextTurn();
    await nextTurn();
    expect(parseMock.mock.calls.map((call) => call[0].index)).toEqual([2n, 3n]);
    sub.cancel();
  });

  it("does not parse a deferred update after cancellation", async () => {
    const stream = new FakeStream();
    const sub = await clientWithStream(stream).subscribeDexEvents();
    await nextTurn();

    stream.emit("data", transactionUpdate());
    sub.cancel();
    await nextTurn();

    expect(parseMock).not.toHaveBeenCalled();
  });

  it("answers Yellowstone ping without waiting for parser scheduling", async () => {
    const stream = new FakeStream();
    const sub = await clientWithStream(stream).subscribeDexEvents();
    await nextTurn();
    expect(stream.writes).toHaveLength(1);

    stream.emit("data", { ping: {} });
    expect(stream.writes).toHaveLength(2);
    sub.cancel();
  });

  it("shares parser time fairly across independent clients", async () => {
    const busyStream = new FakeStream();
    const latencySensitiveStream = new FakeStream();
    const busySub = await clientWithStream(busyStream).subscribeDexEvents([], [], undefined, {
      parserBatchSize: 2,
    });
    const latencySensitiveSub = await clientWithStream(latencySensitiveStream).subscribeDexEvents(
      [],
      [],
      undefined,
      { parserBatchSize: 2 }
    );
    await nextTurn();

    for (let index = 1n; index <= 5n; index++) {
      busyStream.emit("data", transactionUpdate(index));
    }
    latencySensitiveStream.emit("data", transactionUpdate(99n));

    await nextTurn();
    expect(parseMock.mock.calls.map((call) => call[0].index)).toEqual([1n, 2n, 99n]);

    busySub.cancel();
    latencySensitiveSub.cancel();
  });

  it("resumes from the last parsed slot and deduplicates replayed transactions", async () => {
    const first = new FakeStream();
    const second = new FakeStream();
    const sub = await clientWithStreams([first, second]).subscribeDexEvents();
    await nextTurn();

    first.emit("data", transactionUpdate(1n, 10n));
    await sub.next();
    first.emit("error", Object.assign(new Error("connection dropped"), { code: 14 }));

    await vi.waitFor(() => expect(second.writes).toHaveLength(1));
    expect(second.writes[0]).toMatchObject({ fromSlot: "10" });

    second.emit("data", transactionUpdate(1n, 10n));
    second.emit("data", transactionUpdate(2n, 11n));
    await sub.next();
    await nextTurn();

    expect(parseMock.mock.calls.map((call) => call[0].index)).toEqual([1n, 2n]);
    expect(sub.replayedUpdates()).toBe(1);
    expect(sub.streamDisconnects()).toBe(1);
    expect(sub.reconnects()).toBe(1);
    expect(sub.continuityBreaks()).toBe(0);
    sub.cancel();
  });

  it("reports a continuity break and falls back when replay is unsupported", async () => {
    const first = new FakeStream();
    const unsupported = new ReplayUnsupportedStream();
    const live = new FakeStream();
    const sub = await clientWithStreams([first, unsupported, live]).subscribeDexEvents();
    await nextTurn();

    first.emit("data", transactionUpdate(1n, 10n));
    await sub.next();
    first.emit("error", Object.assign(new Error("connection dropped"), { code: 14 }));

    await vi.waitFor(() => expect(live.writes).toHaveLength(1));
    expect(unsupported.writes[0]).toMatchObject({ fromSlot: "10" });
    expect(live.writes[0]).toMatchObject({ fromSlot: undefined });
    expect(sub.continuityBreaks()).toBe(1);
    sub.cancel();
  });

  it("counts every disconnect as a continuity break when replay is disabled", async () => {
    const first = new FakeStream();
    const second = new FakeStream();
    const sub = await clientWithStreams([first, second]).subscribeDexEvents([], [], undefined, {
      replayOnReconnect: false,
    });
    await nextTurn();

    first.emit("data", transactionUpdate(1n, 10n));
    await sub.next();
    first.emit("error", Object.assign(new Error("connection dropped"), { code: 14 }));

    await vi.waitFor(() => expect(second.writes).toHaveLength(1));
    expect(second.writes[0]).toMatchObject({ fromSlot: undefined });
    expect(sub.continuityBreaks()).toBe(1);
    sub.cancel();
  });

  it("safely cancels while the stream is still being set up", async () => {
    const stream = new FakeStream();
    const sub = await clientWithStream(stream).subscribeDexEvents();

    sub.cancel();
    await nextTurn();

    expect(stream.cancelCalls).toBe(1);
    expect(await sub.next()).toEqual({ value: undefined, done: true });
  });

  it("does not flush ordered events into the queue after cancellation", async () => {
    const stream = new FakeStream();
    const sub = await clientWithStream(stream, "Ordered").subscribeDexEvents();
    await nextTurn();

    stream.emit("data", transactionUpdate());
    expect(sub.len()).toBe(0);

    sub.cancel();
    await nextTurn();
    expect(sub.len()).toBe(0);
    expect(await sub.next()).toEqual({ value: undefined, done: true });
  });

  it("keeps exponential backoff for streams that fail before receiving data", async () => {
    let attempts = 0;
    const client = new YellowstoneGrpc("https://example.invalid", "", {
      ...defaultClientConfig(),
      retry_delay_ms: 10,
    });
    (client as unknown as { client: { subscribe: () => Promise<FakeStream> } }).client = {
      subscribe: async () => {
        attempts++;
        return new ImmediatelyFailingStream();
      },
    };

    const sub = await client.subscribeDexEvents();
    await new Promise((resolve) => setTimeout(resolve, 75));
    sub.cancel();

    expect(attempts).toBeGreaterThanOrEqual(3);
    expect(attempts).toBeLessThanOrEqual(5);
  });
});
