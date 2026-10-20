import { resolve } from "node:path";
import {
  analyzeRpcTransactionRoutes,
  screenedStockCatalog,
  stockConversionLegs,
} from "../src/index.js";
import { loadCases, printJson } from "./support/replay_input.js";
const catalog = screenedStockCatalog();
for (const c of loadCases(
  resolve(__dirname, "../tests/fixtures/cross_dex_stock_routes_20261020.json"),
)) {
  const route = analyzeRpcTransactionRoutes(c.rpc);
  printJson({
    name: c.name,
    signature: c.signature,
    replay: true,
    route,
    conversion_legs: stockConversionLegs(catalog, route),
  });
}
