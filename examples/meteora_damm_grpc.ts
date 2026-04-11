/**
 * Meteora DAMM V2 gRPC Example
 *
 * Demonstrates subscribing to Meteora Dynamic AMM V2 events:
 * Swap, AddLiquidity, RemoveLiquidity, CreatePosition, ClosePosition
 *
 * Run: npx tsx examples/meteora_damm_grpc.ts（先在包根目录配置 `.env`，见 `.env.example`）
 * （GRPC_URL / GRPC_TOKEN 必填，未设置则退出）
 */

import bs58 from "bs58";
import { YellowstoneGrpc, parseLogsOnly, grpcTxIndexFromInfo } from "../src/index.js";
import { requireGrpcEnv } from "../scripts/grpc_env.js";

const { ENDPOINT, X_TOKEN } = requireGrpcEnv();

/** 与 `src/instr/program_ids.ts` 中 `METEORA_DAMM_V2_PROGRAM_ID` 一致 */
const PROGRAM_IDS = ["cpamdpZCGKUy5JxQXB2MWgCm3hcnGjEJbYTJgfm4E8a"];

let swapCount = 0;
let addLiqCount = 0;
let removeLiqCount = 0;
let createPosCount = 0;
let closePosCount = 0;

async function main() {
  console.log("🚀 Meteora DAMM V2 gRPC Example");
  console.log("=================================\n");
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
      const events = parseLogsOnly(logs, sig, Number(slot), undefined, grpcTxIndexFromInfo(txInfo));

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
