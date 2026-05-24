import { describe, expect, it } from "vitest";
import { defaultPubkey } from "../core/dex_event.js";
import { parsePumpswapInstruction } from "./pumpswap_ix.js";

function ix(disc: number[]): Uint8Array {
  const out = new Uint8Array(24);
  out.set(disc, 0);
  return out;
}

function accounts(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `Account${String(i).padStart(2, "0")}`);
}

describe("parsePumpswapInstruction", () => {
  it("does not infer coin_creator from the program account", () => {
    const ev = parsePumpswapInstruction(
      ix([102, 6, 61, 18, 1, 218, 235, 234]),
      accounts(26),
      "sig",
      1,
      0,
      undefined
    );

    expect(ev).not.toBeNull();
    const buy = (ev as any).PumpSwapBuy;
    expect(buy.coin_creator).toBe(defaultPubkey());
    expect(buy.pool_v2).toBe("Account23");
    expect(buy.fee_recipient).toBe("Account24");
    expect(buy.fee_recipient_quote_token_account).toBe("Account25");
  });
});
