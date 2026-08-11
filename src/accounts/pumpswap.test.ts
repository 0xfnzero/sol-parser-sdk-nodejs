import { describe, expect, it } from "vitest";
import { parsePumpswapPool } from "./pumpswap.js";
import type { AccountData } from "./types.js";

const POOL_DISC = [241, 154, 109, 4, 17, 177, 109, 188];
const metadata = { signature: "sig", slot: 1, tx_index: 0, block_time_us: 0, grpc_recv_us: 1 };

function poolAccount(bodyLength: number, virtualQuoteReserves?: bigint): AccountData {
  const data = new Uint8Array(8 + bodyLength);
  data.set(POOL_DISC);
  if (virtualQuoteReserves !== undefined) {
    const value = BigInt.asUintN(128, virtualQuoteReserves);
    const view = new DataView(data.buffer, data.byteOffset + 8 + 237, 16);
    view.setBigUint64(0, value & ((1n << 64n) - 1n), true);
    view.setBigUint64(8, value >> 64n, true);
  }
  return {
    pubkey: "pool",
    executable: false,
    lamports: 0n,
    owner: "owner",
    rent_epoch: 0n,
    data,
  };
}

describe("PumpSwap pool account parser", () => {
  it("defaults legacy virtual reserves and reads the current signed i128 field", () => {
    const legacy = parsePumpswapPool(poolAccount(244), metadata);
    expect((legacy as any).PumpSwapPoolAccount.pool.virtual_quote_reserves).toBe(0n);

    const current = parsePumpswapPool(poolAccount(253, -987_654_321n), metadata);
    expect((current as any).PumpSwapPoolAccount.pool.virtual_quote_reserves).toBe(-987_654_321n);
  });

  it("rejects a partial upgraded account layout", () => {
    expect(parsePumpswapPool(poolAccount(245), metadata)).toBeNull();
  });
});
