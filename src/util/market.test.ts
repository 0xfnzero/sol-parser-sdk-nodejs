import { describe, expect, it } from "vitest";
import {
  normalizeBuySellFromInputMint,
  normalizeBuySellFromTokenDelta,
  sqrtPriceX64ToPrice,
  vaultPriceFromBalances,
} from "./market.js";

describe("market helpers", () => {
  it("normalizes price and buy/sell direction", () => {
    const q64 = 1n << 64n;
    expect(sqrtPriceX64ToPrice(q64, 6, 6)).toBe(1);
    expect(sqrtPriceX64ToPrice(q64, 9, 6)).toBe(1000);
    expect(vaultPriceFromBalances("1000000000", "2000000", 9, 6)).toBe(2);
    expect(vaultPriceFromBalances(0, 2_000_000, 6, 6)).toBeUndefined();
    expect(normalizeBuySellFromTokenDelta(1)).toBe("Buy");
    expect(normalizeBuySellFromTokenDelta(-1)).toBe("Sell");
    expect(normalizeBuySellFromTokenDelta(0)).toBeUndefined();
    expect(normalizeBuySellFromInputMint("USDC", "SOL", "USDC")).toBe("Buy");
    expect(normalizeBuySellFromInputMint("SOL", "SOL", "USDC")).toBe("Sell");
  });
});
