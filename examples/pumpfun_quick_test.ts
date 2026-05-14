/**
 * PumpFun Quick Test
 *
 * Quick connection test - subscribes to ALL PumpFun events,
 * prints the first 10, then exits.
 *
 * Run: npx tsx examples/pumpfun_quick_test.ts（先在包根目录配置 `.env`，见 `.env.example`）
 * （GRPC_URL / GRPC_TOKEN 必填，未设置则退出）
 */

import {
  YellowstoneGrpc,
  transactionFilterForProtocols,
  type DexEvent,
} from "../src/index.js";
import { requireGrpcEnv } from "../scripts/grpc_env.js";

const { ENDPOINT, X_TOKEN } = requireGrpcEnv();

let eventCount = 0;

function eventName(ev: DexEvent): string {
  return Object.keys(ev)[0] ?? "";
}

async function main() {
  console.log("🚀 Quick Test - Subscribing to ALL PumpFun events...");
  console.log(`📡 Endpoint: ${ENDPOINT}\n`);

  const client = new YellowstoneGrpc(ENDPOINT, X_TOKEN);

  const filter = transactionFilterForProtocols(["PumpFun"]);
  console.log("✅ Subscribing... (no event filter - will show ALL events)");
  console.log("🎧 Listening for events... (waiting up to 60 seconds)\n");

  let sub: Awaited<ReturnType<YellowstoneGrpc["subscribeDexEvents"]>> | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const finish = (code: number) => {
    if (timeoutId) clearTimeout(timeoutId);
    sub?.cancel();
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

  const activeSub = await client.subscribeDexEvents([filter], []);
  sub = activeSub;

  (async () => {
    for await (const err of activeSub.errors) {
      console.error("Stream error:", err.message);
      process.exit(1);
    }
  })().catch((err) => {
    console.error("Error stream failed:", err);
    process.exit(1);
  });

  console.log(`✅ Connected. Waiting for PumpFun events...\n`);

  for await (const ev of activeSub) {
    const key = eventName(ev);
    if (!key.startsWith("PumpFun")) continue;

    const data = (ev as Record<string, { metadata?: { slot?: number | bigint } }>)[key] ?? {};
    eventCount++;
    console.log(`✅ Event #${eventCount}: ${key} (slot=${data.metadata?.slot ?? ""})`);

    if (eventCount >= 10) {
      console.log(`\n🎉 Received ${eventCount} events! Test successful!`);
      finish(0);
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
