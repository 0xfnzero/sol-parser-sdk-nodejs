import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { YellowstoneGrpc } from "./client.js";
import { defaultClientConfig } from "./types.js";

vi.mock("./yellowstone_parse.js", () => ({
  parseDexEventsFromGrpcTransactionInfo: () => [testEvent()],
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

  write(_request: unknown, callback: (error?: Error | null) => void): boolean {
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

function clientWithStream(stream: FakeStream, orderMode: "Unordered" | "Ordered" = "Unordered") {
  const client = new YellowstoneGrpc("https://example.invalid", "", {
    ...defaultClientConfig(),
    order_mode: orderMode,
  });
  (client as unknown as { client: { subscribe: () => Promise<FakeStream> } }).client = {
    subscribe: async () => stream,
  };
  return client;
}

function transactionUpdate() {
  return {
    transaction: {
      slot: 10n,
      transaction: {
        signature: new Uint8Array(64),
        isVote: false,
        transaction: {},
        meta: {},
        index: 0n,
      },
    },
  };
}

function nextTurn(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe("YellowstoneGrpc subscribeDexEvents lifecycle", () => {
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
