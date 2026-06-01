import { describe, expect, it } from "vitest";
import { parseMeteoraDammInstruction } from "./meteora_damm_ix.js";

const REMOVE_ALL_LIQUIDITY_DISC = [10, 51, 61, 35, 112, 105, 24, 85];

function accounts(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `account_${i}`);
}

function removeAllLiquidityInstruction(): Uint8Array {
  const data = new Uint8Array(24);
  data.set(REMOVE_ALL_LIQUIDITY_DISC, 0);
  const view = new DataView(data.buffer);
  view.setBigUint64(8, 111n, true);
  view.setBigUint64(16, 222n, true);
  return data;
}

describe("Meteora DAMM V2 instruction parity", () => {
  it("normalizes remove_all_liquidity to the canonical RemoveLiquidity event", () => {
    const ev = parseMeteoraDammInstruction(
      removeAllLiquidityInstruction(),
      accounts(11),
      "sig",
      1,
      0,
      undefined,
      10
    );

    expect(ev).toBeTruthy();
    expect("MeteoraDammV2RemoveLiquidity" in ev!).toBe(true);
    const data = ev && "MeteoraDammV2RemoveLiquidity" in ev ? ev.MeteoraDammV2RemoveLiquidity : null;
    expect(data?.pool).toBe("account_1");
    expect(data?.position).toBe("account_2");
    expect(data?.owner).toBe("account_10");
    expect(data?.token_a_amount_threshold).toBe(111n);
    expect(data?.token_b_amount_threshold).toBe(222n);
    expect(data?.liquidity_delta).toBe(0n);
  });
});
