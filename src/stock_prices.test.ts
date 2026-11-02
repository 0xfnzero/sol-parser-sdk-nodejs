import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { StockPriceTracker } from "./stock_prices";
import { screenedStockCatalog } from "./stock_catalog";
import { replayEvents } from "../examples/support/replay_input";
const cases = JSON.parse(
  readFileSync(
    new URL(
      "../tests/fixtures/stock_price_replay_20261020.json",
      import.meta.url,
    ),
    "utf8",
  ),
).cases;
for (const [index, c] of cases.entries())
  it("replays stock execution " + c.name, () => {
    const events = replayEvents(c.rpc ?? c.wire_rpc ?? c.raw),
      tracker = new StockPriceTracker({ catalog: screenedStockCatalog() });
    const prices = events.flatMap((e) => {
      const p = tracker.process(e, 1_000_000n);
      return p ? [p] : [];
    });
    // The captured ABNB pool is excluded after a large historical withdrawal.
    const expected = [343.6402644024645, null, 904.3107197730765][index];
    expect(prices).toHaveLength(expected === null ? 0 : 1);
    if (expected === null) return;
    expect(prices[0].price_usdc).toBeCloseTo(expected, 8);
    expect(prices[0].liquidity).toBeNull();
    tracker.reset();
    expect(events.every((e) => tracker.process(e, 100_000_000n) === null)).toBe(
      true,
    );
    for (const e of events) {
      const data = Object.values(e)[0];
      // Instruction-only payloads lack execution reserves/prices.
      for (const key of ["input_vault_before", "output_vault_before", "sqrt_price_x64", "post_sqrt_price", "pool_base_token_reserves", "pool_quote_token_reserves"])
        if (key in data) data[key] = 0n;
    }
    for (const e of events) if ("event_version" in Object.values(e)[0]) Object.values(e)[0].event_version = 0;
    expect(events.every((e) => tracker.process(e, 1_000_000n) === null)).toBe(
      true,
    );
    expect(
      events.every(
        (e) => new StockPriceTracker().process(e, 1_000_000n) === null,
      ),
    ).toBe(true);
  });
it("returns independent catalog copies", () => {
  const a = screenedStockCatalog(),
    b = screenedStockCatalog();
  a.pools.length = 0;
  expect(b.pools.length).toBeGreaterThan(0);
});
