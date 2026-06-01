/**
 * Meteora DAMM V2 gRPC Example
 *
 * Demonstrates subscribing to Meteora Dynamic AMM V2 events:
 * Swap, AddLiquidity, RemoveLiquidity, CreatePosition, ClosePosition
 *
 * Run: npx tsx examples/meteora_damm_grpc.ts（先在包根目录配置 `.env`，见 `.env.example`）
 * （GRPC_URL / GRPC_TOKEN 必填，未设置则退出）
 */

import {
  YellowstoneGrpc,
  eventTypeFilterIncludeOnly,
  transactionFilterForProtocols,
  type DexEvent,
} from "../src/index.js";
import { requireGrpcEnv } from "../scripts/grpc_env.js";

const { ENDPOINT, X_TOKEN } = requireGrpcEnv();

let swapCount = 0;
let addLiqCount = 0;
let removeLiqCount = 0;
let createPosCount = 0;
let closePosCount = 0;

function eventEntry(ev: DexEvent): [string, Record<string, unknown>] {
  const key = Object.keys(ev)[0];
  const value = (ev as unknown as Record<string, unknown>)[key];
  return [key, value && typeof value === "object" ? (value as Record<string, unknown>) : {}];
}

async function main() {
  console.log("🚀 Meteora DAMM V2 gRPC Example");
  console.log("=================================\n");
  console.log(`📡 Endpoint: ${ENDPOINT}`);
  console.log(`🎯 Protocol: MeteoraDammV2\n`);

  const client = new YellowstoneGrpc(ENDPOINT, X_TOKEN);

  const filter = transactionFilterForProtocols(["MeteoraDammV2"]);
  const eventFilter = eventTypeFilterIncludeOnly([
    "MeteoraDammV2Swap",
    "MeteoraDammV2AddLiquidity",
    "MeteoraDammV2RemoveLiquidity",
    "MeteoraDammV2CreatePosition",
    "MeteoraDammV2ClosePosition",
  ]);

  const sub = await client.subscribeDexEvents([filter], [], eventFilter);

  (async () => {
    for await (const err of sub.errors) {
      console.error("Stream error:", err.message);
    }
  })().catch((err) => console.error("Error stream failed:", err));

  console.log(`✅ Subscribed (id=${sub.id})`);
  console.log("🛑 Press Ctrl+C to stop...\n");

  process.on("SIGINT", () => {
    sub.cancel();
    console.log(`\n📊 Stats: Swap=${swapCount} AddLiq=${addLiqCount} RemoveLiq=${removeLiqCount} CreatePos=${createPosCount} ClosePos=${closePosCount}`);
    process.exit(0);
  });

  for await (const ev of sub) {
    const [key, data] = eventEntry(ev);
    const metadata = data.metadata as
      | { signature?: string; slot?: number | bigint }
      | undefined;

    switch (key) {
      case "MeteoraDammV2Swap":
        swapCount++;
        console.log(`🔄 SWAP #${swapCount} | sig=${metadata?.signature ?? ""} slot=${metadata?.slot ?? ""}`);
        if (data.amount_in !== undefined) console.log(`   amount_in=${data.amount_in} amount_out=${data.amount_out}`);
        break;
      case "MeteoraDammV2AddLiquidity":
        addLiqCount++;
        console.log(`💧 ADD_LIQUIDITY #${addLiqCount} | sig=${metadata?.signature ?? ""} slot=${metadata?.slot ?? ""}`);
        break;
      case "MeteoraDammV2RemoveLiquidity":
        removeLiqCount++;
        console.log(`🔥 ${key} #${removeLiqCount} | sig=${metadata?.signature ?? ""} slot=${metadata?.slot ?? ""}`);
        break;
      case "MeteoraDammV2CreatePosition":
        createPosCount++;
        console.log(`📌 CREATE_POSITION #${createPosCount} | sig=${metadata?.signature ?? ""} slot=${metadata?.slot ?? ""}`);
        break;
      case "MeteoraDammV2ClosePosition":
        closePosCount++;
        console.log(`❌ CLOSE_POSITION #${closePosCount} | sig=${metadata?.signature ?? ""} slot=${metadata?.slot ?? ""}`);
        break;
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
