/**
 * PumpFun Event Parsing with Detailed Performance Metrics
 *
 * Demonstrates how to:
 * - Subscribe to PumpFun protocol events
 * - Measure gRPC recv time, queue recv time, and end-to-end latency
 * - Display per-event stats and periodic 10s summaries
 *
 * Run: GRPC_URL=... GRPC_TOKEN=... node examples/pumpfun_with_metrics.mjs
 * （兼容 GEYSER_ENDPOINT / GEYSER_API_TOKEN）
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const bs58 = require("bs58");
const {
  YellowstoneGrpc,
  parseLogsOnly,
  nowUs,
} = require(path.join(__dirname, "../dist/index.js"));

const ENDPOINT =
  process.env.GRPC_URL ||
  process.env.GEYSER_ENDPOINT ||
  "https://solana-yellowstone-grpc.publicnode.com:443";
const X_TOKEN =
  process.env.GRPC_TOKEN || process.env.GEYSER_API_TOKEN || "";

const PROGRAM_IDS = ["6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"]; // PumpFun

let eventCount = 0n;
let totalLatencyUs = 0n;
let minLatencyUs = BigInt(Number.MAX_SAFE_INTEGER);
let maxLatencyUs = 0n;
let lastReportCount = 0n;

// Periodic 10s stats
setInterval(() => {
  if (eventCount === 0n) return;
  const eventsInWindow = eventCount - lastReportCount;
  const avg = eventCount > 0n ? totalLatencyUs / eventCount : 0n;
  const evPerSec = (Number(eventsInWindow) / 10).toFixed(1);
  const minUs = minLatencyUs === BigInt(Number.MAX_SAFE_INTEGER) ? 0n : minLatencyUs;

  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║          Performance Stats (10s window)            ║");
  console.log("╠════════════════════════════════════════════════════╣");
  console.log(`║  Total Events : ${String(eventCount).padStart(10)}                              ║`);
  console.log(`║  Events/sec   : ${evPerSec.padStart(10)}                              ║`);
  console.log(`║  Avg Latency  : ${String(avg).padStart(10)} μs                           ║`);
  console.log(`║  Min Latency  : ${String(minUs).padStart(10)} μs                           ║`);
  console.log(`║  Max Latency  : ${String(maxLatencyUs).padStart(10)} μs                           ║`);
  console.log("╚════════════════════════════════════════════════════╝\n");
  lastReportCount = eventCount;
}, 10000);

async function main() {
  console.log("Starting Sol Parser SDK Example with Metrics...");
  console.log("🚀 Subscribing to Yellowstone gRPC events...");
  console.log(`📡 Endpoint: ${ENDPOINT}`);
  console.log(`🎯 Program: ${PROGRAM_IDS[0]}\n`);

  const client = new YellowstoneGrpc(ENDPOINT, X_TOKEN);

  const filter = {
    account_include: PROGRAM_IDS,
    account_exclude: [],
    account_required: [],
    vote: false,
    failed: false,
  };

  const sub = await client.subscribeTransactions(filter, {
    onUpdate: (update) => {
      if (!update.transaction?.transaction) return;
      const txInfo = update.transaction.transaction;
      const slot = update.transaction.slot;
      const logs = txInfo.metaRaw?.logMessages;
      if (!Array.isArray(logs) || logs.length === 0) return;

      const sig = txInfo.signature?.length
        ? bs58.encode(Buffer.from(txInfo.signature))
        : "";
      const t0 = nowUs();
      const events = parseLogsOnly(logs, sig, Number(slot), undefined);

      for (const ev of events) {
        const key = Object.keys(ev)[0];
        if (!key.startsWith("PumpFun")) continue;
        const data = ev[key];
        const parseEndUs = BigInt(data?.metadata?.grpc_recv_us ?? 0);
        // 与 SDK `clock.nowUs()` 同源：从进入 onUpdate 到该条日志解析完成的时间（μs）
        const latencyUs = parseEndUs > 0n ? parseEndUs - BigInt(t0) : 0n;

        eventCount++;
        totalLatencyUs += latencyUs;
        if (latencyUs < minLatencyUs) minLatencyUs = latencyUs;
        if (latencyUs > maxLatencyUs) maxLatencyUs = latencyUs;

        console.log("\n================================================");
        console.log(`parse_end_us (metadata.grpc_recv_us): ${parseEndUs} μs`);
        console.log(`onUpdate t0                        : ${t0} μs`);
        console.log(`Latency (parse_end - t0)           : ${latencyUs} μs`);
        console.log("================================================");
        console.log(`Event: ${key}`);
        if (data?.mint) console.log(`  mint  : ${data.mint}`);
        if (data?.sol_amount !== undefined) console.log(`  sol_amount: ${data.sol_amount}`);
        if (data?.token_amount !== undefined) console.log(`  token_amount: ${data.token_amount}`);
        if (data?.user) console.log(`  user  : ${data.user}`);
        if (data?.name) console.log(`  name  : ${data.name}`);
        if (data?.symbol) console.log(`  symbol: ${data.symbol}`);
        console.log();
      }
    },
    onError: (err) => console.error("Stream error:", err.message),
    onEnd: () => console.log("Stream ended"),
  });

  console.log(`✅ gRPC client created successfully`);
  console.log(`📋 Event Filter: Buy, Sell, BuyExactSolIn, Create`);
  console.log(`✅ Subscribed (id=${sub.id})`);
  console.log("🛑 Press Ctrl+C to stop...\n");

  process.on("SIGINT", () => {
    client.unsubscribe(sub.id);
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
