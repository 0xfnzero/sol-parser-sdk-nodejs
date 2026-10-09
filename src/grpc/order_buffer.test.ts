import { performance } from "node:perf_hooks";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DexEvent } from "../core/dex_event.js";
import { defaultClientConfig } from "./types.js";
import { OrderDispatcher } from "./order_buffer.js";

function event(signature: string, slot: number, txIndex: number): DexEvent {
  return {
    PumpFunTrade: {
      metadata: {
        signature,
        slot: BigInt(slot),
        tx_index: BigInt(txIndex),
        block_time_us: 0n,
        grpc_recv_us: 0n,
      },
      mint: "",
      user: "",
      is_buy: true,
    },
  } as unknown as DexEvent;
}

describe("OrderDispatcher", () => {
  it("orders buffered transactions by slot and tx_index", () => {
    const dispatcher = new OrderDispatcher({
      ...defaultClientConfig(),
      order_mode: "Ordered",
    });
    const out: DexEvent[] = [];

    dispatcher.pushTransactionEvents([event("tx2", 1, 2)], 1, 2, (ev) => out.push(ev));
    dispatcher.pushTransactionEvents([event("tx1", 1, 1)], 1, 1, (ev) => out.push(ev));
    expect(out).toHaveLength(0);

    dispatcher.pushTransactionEvents([event("tx0", 2, 0)], 2, 0, (ev) => out.push(ev));
    expect(out.map((ev) => (ev as any).PumpFunTrade.metadata.signature)).toEqual(["tx1", "tx2"]);
  });

  it("streams every event in the same transaction batch", () => {
    const dispatcher = new OrderDispatcher({
      ...defaultClientConfig(),
      order_mode: "StreamingOrdered",
    });
    const out: DexEvent[] = [];

    dispatcher.pushTransactionEvents(
      [event("tx0-a", 1, 0), event("tx0-b", 1, 0)],
      1,
      0,
      (ev) => out.push(ev)
    );

    expect(out.map((ev) => (ev as any).PumpFunTrade.metadata.signature)).toEqual([
      "tx0-a",
      "tx0-b",
    ]);
  });
});


afterEach(() => vi.restoreAllMocks());
describe("ordering replay and monotonic-clock regressions", () => {
  const signatures = (out: DexEvent[]) => out.map(ev => (ev as any).PumpFunTrade.metadata.signature);
  it("deduplicates future batches and preserves contiguous batch order", () => {
    const d = new OrderDispatcher({ ...defaultClientConfig(), order_mode: "StreamingOrdered" });
    const out: DexEvent[] = []; const emit = (ev: DexEvent) => out.push(ev);
    d.pushTransactionEvents([event("two-a", 10, 2), event("two-b", 10, 2)], 10, 2, emit);
    d.pushTransactionEvents([event("duplicate", 10, 2)], 10, 2, emit);
    d.pushTransactionEvents([event("zero", 10, 0)], 10, 0, emit);
    d.pushTransactionEvents([event("one", 10, 1)], 10, 1, emit);
    d.flushAll(emit);
    expect(signatures(out)).toEqual(["zero", "one", "two-a", "two-b"]);
  });
  it("retains timeout watermark and rejects replay and older slots", () => {
    let now = 0; vi.spyOn(performance, "now").mockImplementation(() => now);
    const d = new OrderDispatcher({ ...defaultClientConfig(), order_mode: "StreamingOrdered", order_timeout_ms: 10 });
    const out: DexEvent[] = []; const emit = (ev: DexEvent) => out.push(ev);
    d.pushTransactionEvents([event("two", 10, 2)], 10, 2, emit);
    now = 11; d.flushDue(emit);
    d.pushTransactionEvents([event("replay", 10, 2)], 10, 2, emit);
    d.pushTransactionEvents([event("late-zero", 10, 0)], 10, 0, emit);
    d.pushTransactionEvents([event("three", 10, 3)], 10, 3, emit);
    d.pushTransactionEvents([event("new-slot", 11, 0)], 11, 0, emit);
    d.pushTransactionEvents([event("old-slot", 10, 4)], 10, 4, emit);
    d.flushAll(emit);
    expect(signatures(out)).toEqual(["two", "three", "new-slot"]);
  });
  it("flushes a 100 microsecond window within one wall-clock millisecond", () => {
    let now = 1; vi.spyOn(performance, "now").mockImplementation(() => now);
    const wall = vi.spyOn(Date, "now").mockReturnValue(1000);
    const d = new OrderDispatcher({ ...defaultClientConfig(), order_mode: "MicroBatch", micro_batch_us: 100 });
    const out: DexEvent[] = []; const emit = (ev: DexEvent) => out.push(ev);
    d.pushTransactionEvents([event("one", 1, 1)], 1, 1, emit);
    now = 1.099; d.flushDue(emit); expect(out).toHaveLength(0);
    wall.mockReturnValue(-1000); now = 1.101; d.flushDue(emit);
    expect(signatures(out)).toEqual(["one"]);
    expect(wall).not.toHaveBeenCalled();
  });
});

it("bounds 10000 repeated pending indexes and drops 10000 old-slot arrivals after flush", () => {
  const d = new OrderDispatcher({ ...defaultClientConfig(), order_mode: "StreamingOrdered" });
  const out: DexEvent[] = []; const emit = (ev: DexEvent) => out.push(ev);
  for (let i = 0; i < 10000; i++) d.pushTransactionEvents([event("pending", 42, 2)], 42, 2, emit);
  const state = d as unknown as { slots: Map<bigint, unknown[]>; streamingPending: Set<bigint>; streamingWatermarks: Map<bigint, bigint> };
  expect(state.slots.get(42n)).toHaveLength(1);
  expect(state.streamingPending.size).toBe(1);
  d.flushAll(emit);
  expect(out).toHaveLength(1);
  expect(state.slots.size).toBe(0);
  expect(state.streamingPending.size).toBe(0);
  d.pushTransactionEvents([event("next", 43, 0)], 43, 0, emit);
  for (let i = 0; i < 10000; i++) d.pushTransactionEvents([event("old", 42, 2)], 42, 2, emit);
  expect(out).toHaveLength(2);
  expect(state.slots.size).toBe(0);
  expect(state.streamingWatermarks.size).toBe(1);
});
