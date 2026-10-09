import { performance } from "node:perf_hooks";
import { describe, expect, it, vi } from "vitest";
import { OrderDispatcher } from "./order_buffer.js";
import { defaultClientConfig } from "./types.js";
import type { DexEvent } from "../core/dex_event.js";
const event = (slot: number, index: number, id = "tx") => ({ BlockMeta: { metadata: {
  signature: id, slot: BigInt(slot), tx_index: BigInt(index), block_time_us: 0n, grpc_recv_us: 0n,
} } }) as DexEvent;

describe("Ordered emitted watermark", () => {
  it("rejects any late batch for a newer-slot-closed slot", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const d = new OrderDispatcher({ ...defaultClientConfig(), order_mode: "Ordered" });
      const out: DexEvent[] = [];
      for (const [slot, index] of [[10, 2], [11, 0], [10, 1], [10, 9], [12, 0]]) {
        d.pushTransactionEvents([event(slot, index)], slot, index, e => out.push(e));
      }
      d.flushAll(e => out.push(e));
      expect(out.map(e => "BlockMeta" in e && [e.BlockMeta.metadata.slot, e.BlockMeta.metadata.tx_index])).toEqual([[10n, 2n], [11n, 0n], [12n, 0n]]);
      expect(d.orderedLateTransactions).toBe(2);
      expect(warn).toHaveBeenCalledTimes(2);
    } finally { warn.mockRestore(); }
  });
  it.each(["explicit", "timeout"])("keeps progress after %s flush and preserves whole transaction event order", kind => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const d = new OrderDispatcher({ ...defaultClientConfig(), order_mode: "Ordered" });
      const out: DexEvent[] = [];
      d.pushTransactionEvents([event(42, 2, "a"), event(42, 2, "b")], 42, 2, e => out.push(e));
      if (kind === "timeout") {
        const clock = vi.spyOn(performance, "now").mockReturnValue(performance.now() + 1000);
        d.flushDue(e => out.push(e));
        clock.mockRestore();
      } else d.flushAll(e => out.push(e));
      for (const index of [0, 1, 2, 3]) d.pushTransactionEvents([event(42, index, `${index}`)], 42, index, e => out.push(e));
      d.flushAll(e => out.push(e));
      expect(out.map(e => "BlockMeta" in e && e.BlockMeta.metadata.signature)).toEqual(["a", "b", "3"]);
      expect(d.orderedLateTransactions).toBe(3);
    } finally { warn.mockRestore(); }
  });
});


it("bounds late-replay diagnostics while counting every dropped transaction", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  try {
    const d = new OrderDispatcher({ ...defaultClientConfig(), order_mode: "Ordered" });
    const out: DexEvent[] = [];
    d.pushTransactionEvents([event(10, 2)], 10, 2, e => out.push(e));
    d.flushAll(e => out.push(e));
    for (let i = 0; i < 10000; i++) d.pushTransactionEvents([event(10, 1)], 10, 1, e => out.push(e));
    expect(d.orderedLateTransactions).toBe(10000);
    expect(warn).toHaveBeenCalledTimes(20);
    expect(out).toHaveLength(1);
    d.pushTransactionEvents([event(10, 3)], 10, 3, e => out.push(e));
    d.flushAll(e => out.push(e));
    expect(out).toHaveLength(2);
  } finally { warn.mockRestore(); }
});
