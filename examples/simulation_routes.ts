/** npx tsx examples/simulation_routes.ts saved-evidence.json [case-name]
 * Accepts {wire:base64,response:simulateTransactionResponse} or {cases:[...]}. No RPC.
 */
import { readFileSync } from "node:fs";
import { analyzeSimulationRoutes } from "../src/index.js";
const file = process.argv[2];
if (!file) throw Error("Provide saved simulation evidence JSON");
const input = JSON.parse(readFileSync(file, "utf8"));
const cases = (input.cases ?? [input]).filter(
  (c: any) => !process.argv[3] || c.name === process.argv[3],
);
if (!cases.length) throw Error("Simulation case not found");
for (const c of cases) {
  const route = analyzeSimulationRoutes(
    Buffer.from(c.wire, "base64"),
    c.response,
  );
  console.log(
    JSON.stringify({ name: c.name ?? null, route }, (_, v) =>
      typeof v === "bigint" ? v.toString() : v,
    ),
  );
}
