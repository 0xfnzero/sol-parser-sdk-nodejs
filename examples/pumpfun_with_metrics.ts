/**
 * PumpFun Event Parsing with Detailed Performance Metrics
 *
 * Demonstrates how to:
 * - Subscribe to PumpFun protocol events
 * - Measure gRPC recv time, queue recv time, and end-to-end latency
 * - Display per-event stats and periodic 10s summaries
 *
 * Run: npx tsx examples/pumpfun_with_metrics.ts（先在包根目录配置 `.env`，见 `.env.example`）
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
  console.log(`🎯 Protocol: PumpFun\n`);

  const config = lowLatencyClientConfig();
  config.enable_metrics = true;
  config.order_mode = "Unordered";
  const client = new YellowstoneGrpc(ENDPOINT, X_TOKEN, config);

  const filter = transactionFilterForProtocols(["PumpFun"]);
  const eventFilter = eventTypeFilterIncludeOnly([
    "PumpFunBuy",
    "PumpFunSell",
    "PumpFunBuyExactSolIn",
    "PumpFunCreate",
  ]);

  const sub = await client.subscribeDexEvents([filter], [], eventFilter);

  (async () => {
    for await (const err of sub.errors) {
      console.error("Stream error:", err.message);
    }
  })().catch((err) => console.error("Error stream failed:", err));

  console.log(`✅ gRPC client created successfully`);
  console.log(`📋 Event Filter: Buy, Sell, BuyExactSolIn, Create`);
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
    console.log(`  sig   : ${metadata?.signature ?? ""}`);
    console.log(`  slot  : ${metadata?.slot ?? ""}`);
    if (data.mint) console.log(`  mint  : ${data.mint}`);
    if (data.sol_amount !== undefined) console.log(`  sol_amount: ${data.sol_amount}`);
    if (data.token_amount !== undefined) console.log(`  token_amount: ${data.token_amount}`);
    if (data.user) console.log(`  user  : ${data.user}`);
    if (data.name) console.log(`  name  : ${data.name}`);
    if (data.symbol) console.log(`  symbol: ${data.symbol}`);
    console.log();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
