import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { StockPriceTracker } from "./stock_prices";
import { screenedStockCatalog } from "./stock_catalog";
import { replayEvents } from "../examples/support/replay_input";
import { TradeParseStatus } from "./core/raw_instruction";
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
    expect(prices).toHaveLength(1);
    expect(prices[0].price_usdc).toBeCloseTo(
      [343.6402644024645, 175.28120314435913, 904.3107197730765][index],
      8,
    );
    expect(prices[0].liquidity).toBeNull();
    tracker.reset();
    expect(events.every((e) => tracker.process(e, 100_000_000n) === null)).toBe(
      true,
    );
    for (const e of events)
      Object.values(e)[0].parse_status = TradeParseStatus.Unresolved;
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
