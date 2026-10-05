/** npx tsx examples/stonkfun_routes.ts <getTransaction-base64.json> */
import { readFileSync } from "node:fs";
import {
  analyzeRpcTransactionRoutes,
  StonkFunPoolRegistry,
} from "../src/index.js";
const input = process.argv[2];
if (!input)
  throw new Error("Provide a saved compiled/base64 getTransaction response");
const tx = JSON.parse(readFileSync(input, "utf8"));
const registry = new StonkFunPoolRegistry();
registry.observeRpcTransaction(tx);
const route = analyzeRpcTransactionRoutes(tx, registry.verifiedCpmmPools());
// Decimal strings preserve u64 amounts when another language reads this JSON.
console.log(
  JSON.stringify(
    route,
    (_, value) => (typeof value === "bigint" ? value.toString() : value),
    2,
  ),
);
