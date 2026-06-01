import { describe, expect, it } from "vitest";
import { parseBuyFromData } from "./pump_amm.js";

const metadata = { signature: "sig", slot: 1, tx_index: 0, block_time_us: 0, grpc_recv_us: 1 };

describe("PumpSwap log parser", () => {
  it("rejects buy payloads truncated before min_base_amount_out", () => {
    expect(parseBuyFromData(new Uint8Array(396), metadata)).toBeNull();
    expect(parseBuyFromData(new Uint8Array(397), metadata)).not.toBeNull();
  });
});
