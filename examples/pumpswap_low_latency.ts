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

import bs58 from "bs58";
import { YellowstoneGrpc, parseLogsOnly, nowUs } from "../src/index.js";
import { requireGrpcEnv } from "../scripts/grpc_env.js";

const { ENDPOINT, X_TOKEN } = requireGrpcEnv();

// PumpSwap program ID
const PROGRAM_IDS = ["pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA"];

let eventCount = 0;
let totalLatencyUs = 0;
let minLatencyUs = Number.MAX_SAFE_INTEGER;
let maxLatencyUs = 0;
let lastReportCount = 0;

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
        if (!key.startsWith("PumpSwap")) continue;

        const data = ev[key];
        const parseEndUs = data?.metadata?.grpc_recv_us ?? 0;
        const latencyUs = parseEndUs > 0 ? parseEndUs - t0 : 0;

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
        console.log(`  sig  : ${sig}`);
        console.log(`  slot : ${slot}`);
        if (data?.pool) console.log(`  pool : ${data.pool}`);
        if (data?.user) console.log(`  user : ${data.user}`);
        console.log();
      }
    },
    onError: (err) => console.error("Stream error:", err.message),
    onEnd: () => console.log("Stream ended"),
  });

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
