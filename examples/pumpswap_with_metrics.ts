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

import {
  YellowstoneGrpc,
  eventTypeFilterIncludeOnly,
  lowLatencyClientConfig,
  nowUs,
  transactionFilterForProtocols,
  type DexEvent,
} from "../src/index.js";
import { requireGrpcEnv } from "../scripts/grpc_env.js";

const { ENDPOINT, X_TOKEN } = requireGrpcEnv();

let eventCount = 0n;
let totalLatencyUs = 0n;
let minLatencyUs = BigInt(Number.MAX_SAFE_INTEGER);
let maxLatencyUs = 0n;
let lastReportCount = 0n;

function eventEntry(ev: DexEvent): [string, Record<string, unknown>] {
  const key = Object.keys(ev)[0];
  const value = (ev as unknown as Record<string, unknown>)[key];
  return [key, value && typeof value === "object" ? (value as Record<string, unknown>) : {}];
}

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
  console.log(`🎯 Protocol: PumpSwap\n`);

  const config = lowLatencyClientConfig();
  config.enable_metrics = true;
  config.order_mode = "Unordered";
  const client = new YellowstoneGrpc(ENDPOINT, X_TOKEN, config);

  const filter = transactionFilterForProtocols(["PumpSwap"]);
  const eventFilter = eventTypeFilterIncludeOnly([
    "PumpSwapBuy",
    "PumpSwapSell",
    "PumpSwapCreatePool",
    "PumpSwapLiquidityAdded",
    "PumpSwapLiquidityRemoved",
  ]);

  const sub = await client.subscribeDexEvents([filter], [], eventFilter);

  (async () => {
    for await (const err of sub.errors) {
      console.error("Stream error:", err.message);
    }
  })().catch((err) => console.error("Error stream failed:", err));

  console.log(`✅ gRPC client created successfully`);
  console.log(`📋 Event Filter: Buy, Sell, CreatePool, LiquidityAdded, LiquidityRemoved`);
  console.log(`✅ Subscribed (id=${sub.id})`);
  console.log("🛑 Press Ctrl+C to stop...\n");

  process.on("SIGINT", () => {
    sub.cancel();
    process.exit(0);
  });

  for await (const ev of sub) {
    const queueRecvUs = BigInt(nowUs());
    const [key, data] = eventEntry(ev);
    const metadata = data.metadata as
      | { grpc_recv_us?: number; signature?: string; slot?: number | bigint }
      | undefined;
    const grpcRecvUs = BigInt(metadata?.grpc_recv_us ?? 0);
    const latencyUs = grpcRecvUs > 0n && queueRecvUs > grpcRecvUs ? queueRecvUs - grpcRecvUs : 0n;

    eventCount++;
    totalLatencyUs += latencyUs;
    if (latencyUs < minLatencyUs) minLatencyUs = latencyUs;
    if (latencyUs > maxLatencyUs) maxLatencyUs = latencyUs;

    console.log("\n================================================");
    console.log(`gRPC recv time : ${grpcRecvUs} μs`);
    console.log(`Queue recv time: ${queueRecvUs} μs`);
    console.log(`Latency        : ${latencyUs} μs`);
    console.log("================================================");
    console.log(`Event: ${key}`);
    console.log(`  sig  : ${metadata?.signature ?? ""}`);
    console.log(`  slot : ${metadata?.slot ?? ""}`);
    if (data.pool) console.log(`  pool : ${data.pool}`);
    if (data.user) console.log(`  user : ${data.user}`);
    if (data.base_mint) console.log(`  base_mint : ${data.base_mint}`);
    if (data.quote_mint) console.log(`  quote_mint: ${data.quote_mint}`);
    console.log();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
