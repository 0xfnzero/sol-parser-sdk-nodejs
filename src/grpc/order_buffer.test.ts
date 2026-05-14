import { describe, expect, it } from "vitest";
import type { DexEvent } from "../core/dex_event.js";
import { defaultClientConfig } from "./types.js";
import { OrderDispatcher } from "./order_buffer.js";

function event(signature: string, slot: number, txIndex: number): DexEvent {
  return {
    PumpFunTrade: {
      metadata: {
        signature,
        slot,
        tx_index: txIndex,
        block_time_us: 0,
        grpc_recv_us: 0,
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
