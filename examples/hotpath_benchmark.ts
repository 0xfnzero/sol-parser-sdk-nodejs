/** Native fixed-workload local benchmark. Configuration and fixtures load before timing. */
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import { wireBytesToShredWasmTx } from "../src/shredstream/wire_to_shred_tx.js";
import { dexEventsFromShredWasmTxWithLoadedAddresses } from "../src/shredstream/instruction_parse.js";
import { eventTypeFilterIncludeOnly } from "../src/grpc/types.js";
const root = __dirname;
export function runHotpathBenchmark(
  configPath = resolve(root, "hotpath_benchmark.json"),
) {
  const config: { warmup: number; samples: number; batch: number } = JSON.parse(
    readFileSync(configPath, "utf8"),
  );
  for (const field of ["warmup", "samples", "batch"] as const)
    if (
      !Number.isSafeInteger(config[field]) ||
      config[field] < 1 ||
      config[field] > 100000
    )
      throw Error("Invalid benchmark " + field);
  const fixtures: {
    wire: string;
    slot: number;
    loaded_writable: string[];
    loaded_readonly: string[];
  }[] = JSON.parse(
    readFileSync(resolve(root, "fixtures/pump_shred_routes.json"), "utf8"),
  );
  const decoded = fixtures.map(
    (f) => wireBytesToShredWasmTx(Buffer.from(f.wire, "base64"))!,
  );
  const wires = fixtures.map((f) => Buffer.from(f.wire, "base64"));
  const filter = eventTypeFilterIncludeOnly(["PumpFunTrade", "PumpFunCreate"]);
  const parse = (tx: (typeof decoded)[number], i: number) =>
    dexEventsFromShredWasmTxWithLoadedAddresses(
      tx,
      fixtures[i]!.loaded_writable,
      fixtures[i]!.loaded_readonly,
      fixtures[i]!.slot,
      888,
      999,
      filter,
    ).length;
  const cases: { name: string; run: () => number; work: number }[] = [
    {
      name: "resolved_parse_wrapped_alt",
      run: () => decoded.reduce((n, tx, i) => n + parse(tx, i), 0),
      work: fixtures.length,
    },
    {
      name: "wire_decode_and_parse_wrapped_alt",
      run: () =>
        wires.reduce((n, w, i) => n + parse(wireBytesToShredWasmTx(w)!, i), 0),
      work: fixtures.length,
    },
  ];
  let checksum = 0;
  const results = cases.map((c) => {
    for (let i = 0; i < config.warmup; i++) checksum += c.run();
    const times: number[] = [];
    for (let i = 0; i < config.samples; i++) {
      const start = performance.now();
      for (let j = 0; j < config.batch; j++) checksum += c.run();
      times.push(
        ((performance.now() - start) * 1000) / (config.batch * c.work),
      );
    }
    times.sort((a, b) => a - b);
    const at = (p: number) =>
      times[Math.min(times.length - 1, Math.ceil(times.length * p) - 1)]!;
    return {
      name: c.name,
      unit: "microseconds/transaction",
      p50: at(0.5),
      p95: at(0.95),
      p99: at(0.99),
    };
  });
  return {
    runtime: process.version,
    platform: process.platform,
    config,
    results,
    checksum,
    note: "Warm fixed local workloads; batch-normalized samples. Excludes fixtures/setup/network. No production latency guarantee.",
  };
}
if (process.argv[1]?.endsWith("hotpath_benchmark.ts"))
  console.log(JSON.stringify(runHotpathBenchmark(process.argv[2]), null, 2));
