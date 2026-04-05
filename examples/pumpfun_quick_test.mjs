/**
 * PumpFun Quick Test
 *
 * Quick connection test - subscribes to ALL PumpFun events,
 * prints the first 10, then exits.
 *
 * Run: GEYSER_API_TOKEN=your_token node examples/pumpfun_quick_test.mjs
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { YellowstoneGrpc, parseLogsOnly } = require(path.join(__dirname, "../dist/index.js"));

const ENDPOINT = process.env.GEYSER_ENDPOINT || "https://solana-yellowstone-grpc.publicnode.com:443";
const X_TOKEN = process.env.GEYSER_API_TOKEN || "";

const PROGRAM_IDS = ["6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"]; // PumpFun

let eventCount = 0;
let sub = null;
let client = null;

async function main() {
  console.log("🚀 Quick Test - Subscribing to ALL PumpFun events...");
  console.log(`📡 Endpoint: ${ENDPOINT}\n`);

  client = new YellowstoneGrpc(ENDPOINT, X_TOKEN);

  const filter = {
    account_include: PROGRAM_IDS,
    account_exclude: [],
    account_required: [],
    vote: false,
    failed: false,
  };

  console.log("✅ Subscribing... (no event filter - will show ALL events)");
  console.log("🎧 Listening for events... (waiting up to 60 seconds)\n");

  const startMs = Date.now();

  sub = await client.subscribeTransactions(filter, {
    onUpdate: (update) => {
      if (!update.transaction?.transaction) return;
      const txInfo = update.transaction.transaction;
      const slot = update.transaction.slot;
      const logs = txInfo.metaRaw?.logMessages;
      if (!Array.isArray(logs) || logs.length === 0) return;

      const sig = Buffer.from(txInfo.signature ?? []).toString("hex").slice(0, 16) + "...";
      const events = parseLogsOnly(logs, sig, Number(slot), undefined);

      for (const ev of events) {
        const key = Object.keys(ev)[0];
        if (!key.startsWith("PumpFun")) continue;

        eventCount++;
        console.log(`✅ Event #${eventCount}: ${key} (slot=${slot})`);

        if (eventCount >= 10) {
          console.log(`\n🎉 Received ${eventCount} events! Test successful!`);
          if (sub) client.unsubscribe(sub.id);
          process.exit(0);
        }
      }

      // 60-second timeout
      if (Date.now() - startMs > 60000) {
        if (eventCount === 0) {
          console.log("⏰ Timeout: No events received in 60 seconds.");
          console.log("   This might indicate:");
          console.log("   - Network connectivity issues");
          console.log("   - gRPC endpoint is down");
          console.log("   - Missing or invalid API token");
        } else {
          console.log(`\n✅ Received ${eventCount} events in 60 seconds`);
        }
        if (sub) client.unsubscribe(sub.id);
        process.exit(0);
      }
    },
    onError: (err) => {
      console.error("Stream error:", err.message);
      process.exit(1);
    },
    onEnd: () => console.log("Stream ended"),
  });

  console.log(`✅ Connected. Waiting for PumpFun events...\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
