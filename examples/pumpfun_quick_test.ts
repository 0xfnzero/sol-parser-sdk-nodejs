/**
 * PumpFun Quick Test
 *
 * Quick connection test - subscribes to ALL PumpFun events,
 * prints the first 10, then exits.
 *
 * Run: npx tsx examples/pumpfun_quick_test.ts（先在包根目录配置 `.env`，见 `.env.example`）
 * （GRPC_URL / GRPC_TOKEN 必填，未设置则退出）
 */

import bs58 from "bs58";
import { YellowstoneGrpc, parseLogsOnly } from "../src/index.js";
import { requireGrpcEnv } from "../scripts/grpc_env.js";

const { ENDPOINT, X_TOKEN } = requireGrpcEnv();

const PROGRAM_IDS = ["6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"]; // PumpFun

let eventCount = 0;
let sub = null;
let client = null;
let timeoutId = null;

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

  const finish = (code) => {
    if (timeoutId) clearTimeout(timeoutId);
    if (sub && client) client.unsubscribe(sub.id);
    process.exit(code);
  };

  timeoutId = setTimeout(() => {
    if (eventCount === 0) {
      console.log("⏰ Timeout: No events received in 60 seconds.");
      console.log("   This might indicate:");
      console.log("   - Network connectivity issues");
      console.log("   - gRPC endpoint is down");
      console.log("   - Missing or invalid API token");
    } else {
      console.log(`\n✅ Received ${eventCount} events in 60 seconds`);
    }
    finish(0);
  }, 60_000);

  process.on("SIGINT", () => {
    finish(0);
  });

  sub = await client.subscribeTransactions(filter, {
    onUpdate: (update) => {
      if (!update.transaction?.transaction) return;
      const txInfo = update.transaction.transaction;
      const slot = update.transaction.slot;
      const logs = txInfo.metaRaw?.logMessages;
      if (!Array.isArray(logs) || logs.length === 0) return;

      const sig = txInfo.signature?.length
        ? bs58.encode(Buffer.from(txInfo.signature))
        : "";
      const events = parseLogsOnly(logs, sig, Number(slot), undefined);

      for (const ev of events) {
        const key = Object.keys(ev)[0];
        if (!key.startsWith("PumpFun")) continue;

        eventCount++;
        console.log(`✅ Event #${eventCount}: ${key} (slot=${slot})`);

        if (eventCount >= 10) {
          console.log(`\n🎉 Received ${eventCount} events! Test successful!`);
          finish(0);
        }
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
