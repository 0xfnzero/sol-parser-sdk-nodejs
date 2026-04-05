/**
 * PumpSwap Low-Latency Example
 *
 * Demonstrates how to:
 * - Subscribe to PumpSwap protocol events
 * - Measure end-to-end latency
 * - Display per-event and periodic statistics
 *
 * Run: node examples/pumpswap_low_latency.mjs
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { YellowstoneGrpc, parseLogsOnly } = require(path.join(__dirname, "../dist/index.js"));

const ENDPOINT = process.env.GEYSER_ENDPOINT || "https://solana-yellowstone-grpc.publicnode.com:443";
const X_TOKEN = process.env.GEYSER_API_TOKEN || "";

// PumpSwap program ID
const PROGRAM_IDS = ["pAMMBay6oceH9fJKBRdGP4LmT4saRGfEE7xmrCaGWpZ"];

let eventCount = 0;
let totalLatencyUs = 0;
let minLatencyUs = Number.MAX_SAFE_INTEGER;
let maxLatencyUs = 0;
let lastReportCount = 0;

function nowUs() {
  return Number(process.hrtime.bigint() / 1000n);
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

      const sig = Buffer.from(txInfo.signature ?? []).toString("hex").slice(0, 16) + "...";
      const queueRecvUs = nowUs();
      const events = parseLogsOnly(logs, sig, Number(slot), undefined);

      for (const ev of events) {
        const key = Object.keys(ev)[0];
        if (!key.startsWith("PumpSwap")) continue;

        const data = ev[key];
        const grpcRecvUs = data?.metadata?.grpc_recv_us ?? queueRecvUs;
        const latencyUs = queueRecvUs - grpcRecvUs;

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
