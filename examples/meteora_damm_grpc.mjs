/**
 * Meteora DAMM V2 gRPC Example
 *
 * Demonstrates subscribing to Meteora Dynamic AMM V2 events:
 * Swap, AddLiquidity, RemoveLiquidity, CreatePosition, ClosePosition
 *
 * Run: node examples/meteora_damm_grpc.mjs
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { YellowstoneGrpc, parseLogsOnly } = require(path.join(__dirname, "../dist/index.js"));

const ENDPOINT = process.env.GEYSER_ENDPOINT || "https://solana-yellowstone-grpc.publicnode.com:443";
const X_TOKEN = process.env.GEYSER_API_TOKEN || "";

const PROGRAM_IDS = ["Eo7WjKq67rjJQDd1d4dSYkT7LeHVAaFL1K7dajEgrpwz"]; // Meteora DAMM V2

let swapCount = 0;
let addLiqCount = 0;
let removeLiqCount = 0;
let createPosCount = 0;
let closePosCount = 0;

async function main() {
  console.log("🚀 Meteora DAMM V2 gRPC Example");
  console.log("=================================\n");

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
      const events = parseLogsOnly(logs, sig, Number(slot), undefined);

      for (const ev of events) {
        const key = Object.keys(ev)[0];
        if (!key.startsWith("MeteoraDammV2")) continue;

        const data = ev[key];

        switch (key) {
          case "MeteoraDammV2Swap":
            swapCount++;
            console.log(`🔄 SWAP #${swapCount} | sig=${sig} slot=${slot}`);
            if (data?.amount_in !== undefined) console.log(`   amount_in=${data.amount_in} amount_out=${data.amount_out}`);
            break;
          case "MeteoraDammV2AddLiquidity":
            addLiqCount++;
            console.log(`💧 ADD_LIQUIDITY #${addLiqCount} | sig=${sig} slot=${slot}`);
            break;
          case "MeteoraDammV2RemoveLiquidity":
            removeLiqCount++;
            console.log(`🔥 REMOVE_LIQUIDITY #${removeLiqCount} | sig=${sig} slot=${slot}`);
            break;
          case "MeteoraDammV2CreatePosition":
            createPosCount++;
            console.log(`📌 CREATE_POSITION #${createPosCount} | sig=${sig} slot=${slot}`);
            break;
          case "MeteoraDammV2ClosePosition":
            closePosCount++;
            console.log(`❌ CLOSE_POSITION #${closePosCount} | sig=${sig} slot=${slot}`);
            break;
        }
      }
    },
    onError: (err) => console.error("Stream error:", err.message),
    onEnd: () => console.log("Stream ended"),
  });

  console.log(`✅ Subscribed (id=${sub.id})`);
  console.log("🛑 Press Ctrl+C to stop...\n");

  process.on("SIGINT", () => {
    client.unsubscribe(sub.id);
    console.log(`\n📊 Stats: Swap=${swapCount} AddLiq=${addLiqCount} RemoveLiq=${removeLiqCount} CreatePos=${createPosCount} ClosePos=${closePosCount}`);
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
