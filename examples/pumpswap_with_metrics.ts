/**
 * PumpSwap Event Parsing with Detailed Performance Metrics
 *
 * Demonstrates how to:
 * - Subscribe to PumpSwap protocol events
 * - Measure gRPC recv time, queue recv time, and end-to-end latency per event
 * - Display periodic 10s summaries (total count, rate, avg/min/max latency)
 *
 * Run: npx tsx examples/pumpswap_with_metrics.ts（先在包根目录配置 `.env`，见 `.env.example`）
 * （GRPC_URL / GRPC_TOKEN 必填，未设置则退出）
 */

import bs58 from "bs58";
import { YellowstoneGrpc, parseLogsOnly, grpcTxIndexFromInfo, nowUs } from "../src/index.js";
import { requireGrpcEnv } from "../scripts/grpc_env.js";

const { ENDPOINT, X_TOKEN } = requireGrpcEnv();

const PROGRAM_IDS = ["pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA"]; // PumpSwap

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
  console.log("║      PumpSwap Performance Stats (10s window)       ║");
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
  console.log("PumpSwap event parsing with detailed performance metrics");
  console.log("🚀 Subscribing to Yellowstone gRPC (PumpSwap)...");
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
      const events = parseLogsOnly(logs, sig, Number(slot), undefined, grpcTxIndexFromInfo(txInfo));

      for (const ev of events) {
        const key = Object.keys(ev)[0];
        if (!key.startsWith("PumpSwap")) continue;
        const data = ev[key];
        const parseEndUs = BigInt(data?.metadata?.grpc_recv_us ?? 0);
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
        if (data?.pool) console.log(`  pool : ${data.pool}`);
        if (data?.user) console.log(`  user : ${data.user}`);
        if (data?.base_mint) console.log(`  base_mint : ${data.base_mint}`);
        if (data?.quote_mint) console.log(`  quote_mint: ${data.quote_mint}`);
        console.log();
      }
    },
    onError: (err) => console.error("Stream error:", err.message),
    onEnd: () => console.log("Stream ended"),
  });

  console.log(`✅ gRPC client created successfully`);
  console.log(`📋 Event Filter: Buy, Sell, CreatePool, LiquidityAdded, LiquidityRemoved`);
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
