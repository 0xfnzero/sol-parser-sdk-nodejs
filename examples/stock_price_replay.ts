import { resolve } from "node:path";
import { StockPriceTracker, screenedStockCatalog } from "../src/index.js";
import { loadCases, replayEvents, printJson } from "./support/replay_input.js";
const tracker = new StockPriceTracker({ catalog: screenedStockCatalog() });
for (const c of loadCases(
  resolve(__dirname, "../tests/fixtures/stock_price_replay_20261020.json"),
)) {
  tracker.reset(); // Captures have no shared continuity guarantee.
  const prices = replayEvents(c.rpc).flatMap((event) => {
    const price = tracker.process(event, 1_000_000n);
    return price ? [price] : [];
  });
  printJson({ name: c.name, signature: c.signature, replay: true, prices });
}
