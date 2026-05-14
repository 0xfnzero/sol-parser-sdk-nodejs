/**
 * PumpSwap Low-Latency Example
 *
 * Demonstrates how to:
 * - Subscribe to PumpSwap protocol events
 * - Measure end-to-end latency
 * - Display per-event and periodic statistics
 *
 * Run: npx tsx examples/pumpswap_low_latency.ts（先在包根目录配置 `.env`，见 `.env.example`）
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

const PROTOCOLS = ["PumpSwap"] as const;

let eventCount = 0;
let totalLatencyUs = 0;
let minLatencyUs = Number.MAX_SAFE_INTEGER;
let maxLatencyUs = 0;
let lastReportCount = 0;

function eventEntry(ev: DexEvent): [string, Record<string, unknown>] {
  const key = Object.keys(ev)[0];
  const value = (ev as unknown as Record<string, unknown>)[key];
  return [key, value && typeof value === "object" ? (value as Record<string, unknown>) : {}];
}

function eventSignature(data: Record<string, unknown>): string {
  const metadata = data.metadata as { signature?: string } | undefined;
  return metadata?.signature ?? "";
}

// Print statistics every 10 seconds
setInterval(() => {
  if (eventCount === 0) return;
  const eventsInWindow = eventCount - lastReportCount;
  const avgUs = eventCount > 0 ? Math.floor(totalLatencyUs / eventCount) : 0;
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║          Performance Stats (10s window)            ║");
  console.log("╠════════════════════════════════════════════════════╣");
  console.log(`║  Total Events : ${String(eventCount).padStart(10)}                              ║`);
  console.log(`║  Events/sec   : ${(eventsInWindow / 10).toFixed(1).padStart(10)}                              ║`);
  console.log(`║  Avg Latency  : ${String(avgUs).padStart(10)} μs                           ║`);
  console.log(`║  Min Latency  : ${String(minLatencyUs === Number.MAX_SAFE_INTEGER ? 0 : minLatencyUs).padStart(10)} μs                           ║`);
  console.log(`║  Max Latency  : ${String(maxLatencyUs).padStart(10)} μs                           ║`);
  console.log("╚════════════════════════════════════════════════════╝\n");
  lastReportCount = eventCount;
}, 10000);

async function main() {
  console.log("🚀 PumpSwap Low-Latency Test");
  console.log("============================\n");
  console.log(`📡 Endpoint: ${ENDPOINT}`);
  console.log(`🎯 Protocols: ${PROTOCOLS.join(", ")}\n`);

  const config = lowLatencyClientConfig();
  config.enable_metrics = true;
  config.order_mode = "Unordered";

  const client = new YellowstoneGrpc(ENDPOINT, X_TOKEN, config);
  const txFilter = transactionFilterForProtocols(PROTOCOLS);
  const eventFilter = eventTypeFilterIncludeOnly([
    "PumpSwapBuy",
    "PumpSwapSell",
    "PumpSwapCreatePool",
  ]);

  const sub = await client.subscribeDexEvents([txFilter], [], eventFilter);

  (async () => {
    for await (const err of sub.errors) {
      console.error("Stream error:", err.message);
    }
  })().catch((err) => console.error("Error stream failed:", err));

  console.log(`✅ Subscribed (id=${sub.id})`);
  console.log("🛑 Press Ctrl+C to stop...\n");

  process.on("SIGINT", () => {
    sub.cancel();
    process.exit(0);
  });

  for await (const ev of sub) {
    const queueRecvUs = nowUs();
    const [key, data] = eventEntry(ev);
    const metadata = data.metadata as
      | { grpc_recv_us?: number; slot?: number | bigint; signature?: string }
      | undefined;
    const grpcRecvUs = metadata?.grpc_recv_us ?? 0;
    const latencyUs = Math.max(0, grpcRecvUs > 0 ? queueRecvUs - grpcRecvUs : 0);

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
    console.log(`  sig  : ${eventSignature(data)}`);
    console.log(`  slot : ${metadata?.slot ?? ""}`);
    if (data.pool) console.log(`  pool : ${data.pool}`);
    if (data.user) console.log(`  user : ${data.user}`);
    console.log();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
