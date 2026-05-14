/**
 * PumpFun Trade Event Filter Example
 *
 * Demonstrates how to:
 * - Subscribe to PumpFun protocol events
 * - Filter specific trade types: Buy, Sell, BuyExactSolIn, Create
 * - Display trade details with latency metrics
 *
 * Run: npx tsx examples/pumpfun_trade_filter.ts
 * 配置 `.env`（见 `.env.example`）或在 shell 中 export GRPC_URL / GRPC_TOKEN
 * （GRPC_URL / GRPC_TOKEN 必填，未设置则退出）
 */

import {
  YellowstoneGrpc,
  eventTypeFilterIncludeOnly,
  nowUs,
  transactionFilterForProtocols,
  type DexEvent,
} from "../src/index.js";
import { requireGrpcEnv } from "../scripts/grpc_env.js";

const { ENDPOINT, X_TOKEN } = requireGrpcEnv();

let eventCount = 0;
let buyCount = 0;
let sellCount = 0;
let buyExactCount = 0;
let createCount = 0;

function eventEntry(ev: DexEvent): [string, Record<string, unknown>] {
  const key = Object.keys(ev)[0];
  const value = (ev as unknown as Record<string, unknown>)[key];
  return [key, value && typeof value === "object" ? (value as Record<string, unknown>) : {}];
}

async function main() {
  console.log("🚀 PumpFun Trade Event Filter Example");
  console.log("======================================\n");
  console.log(`📡 Endpoint: ${ENDPOINT}`);
  console.log(`🎯 Protocol: PumpFun\n`);

  const client = new YellowstoneGrpc(ENDPOINT, X_TOKEN);

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

  console.log(`✅ Subscribed (id=${sub.id})`);
  console.log("🛑 Press Ctrl+C to stop...\n");

  process.on("SIGINT", () => {
    sub.cancel();
    console.log(`\n👋 Total events: ${eventCount} (Buy=${buyCount} Sell=${sellCount} BuyExact=${buyExactCount} Create=${createCount})`);
    process.exit(0);
  });

  for await (const ev of sub) {
    const queueRecvUs = nowUs();
    const [key, data] = eventEntry(ev);
    const metadata = data.metadata as
      | { signature?: string; slot?: number | bigint; grpc_recv_us?: number }
      | undefined;
    const latencyUs = Math.max(
      0,
      metadata?.grpc_recv_us ? queueRecvUs - metadata.grpc_recv_us : 0
    );
    eventCount++;

    switch (key) {
      case "PumpFunBuy":
      case "PumpFunBuyExactSolIn": {
        if (key === "PumpFunBuy") buyCount++;
        else buyExactCount++;
        console.log("┌─────────────────────────────────────────────────────────────");
        console.log(`│ 🟢 ${key} #${eventCount}`);
        console.log("├─────────────────────────────────────────────────────────────");
        console.log(`│ Signature  : ${metadata?.signature ?? ""}`);
        console.log(`│ Slot       : ${metadata?.slot ?? ""}`);
        console.log("├─────────────────────────────────────────────────────────────");
        console.log(`│ Mint       : ${data.mint ?? "N/A"}`);
        console.log(`│ SOL Amount : ${data.sol_amount ?? 0} lamports`);
        console.log(`│ Token Amt  : ${data.token_amount ?? 0}`);
        console.log(`│ User       : ${data.user ?? "N/A"}`);
        console.log("├─────────────────────────────────────────────────────────────");
        console.log(`│ 📊 Latency : ${latencyUs} μs`);
        console.log(`│ 📊 Stats   : Buy=${buyCount} Sell=${sellCount} BuyExact=${buyExactCount}`);
        console.log("└─────────────────────────────────────────────────────────────\n");
        break;
      }
      case "PumpFunSell": {
        sellCount++;
        console.log("┌─────────────────────────────────────────────────────────────");
        console.log(`│ 🔴 PumpFun SELL #${eventCount}`);
        console.log("├─────────────────────────────────────────────────────────────");
        console.log(`│ Signature  : ${metadata?.signature ?? ""}`);
        console.log(`│ Slot       : ${metadata?.slot ?? ""}`);
        console.log("├─────────────────────────────────────────────────────────────");
        console.log(`│ Mint       : ${data.mint ?? "N/A"}`);
        console.log(`│ SOL Amount : ${data.sol_amount ?? 0} lamports`);
        console.log(`│ Token Amt  : ${data.token_amount ?? 0}`);
        console.log(`│ User       : ${data.user ?? "N/A"}`);
        console.log("├─────────────────────────────────────────────────────────────");
        console.log(`│ 📊 Latency : ${latencyUs} μs`);
        console.log(`│ 📊 Stats   : Buy=${buyCount} Sell=${sellCount} BuyExact=${buyExactCount}`);
        console.log("└─────────────────────────────────────────────────────────────\n");
        break;
      }
      case "PumpFunCreate": {
        createCount++;
        console.log("┌─────────────────────────────────────────────────────────────");
        console.log(`│ 🆕 PumpFun CREATE #${eventCount}`);
        console.log("├─────────────────────────────────────────────────────────────");
        console.log(`│ Signature  : ${metadata?.signature ?? ""}`);
        console.log(`│ Slot       : ${metadata?.slot ?? ""}`);
        console.log("├─────────────────────────────────────────────────────────────");
        console.log(`│ Name       : ${data.name ?? "N/A"}`);
        console.log(`│ Symbol     : ${data.symbol ?? "N/A"}`);
        console.log(`│ Mint       : ${data.mint ?? "N/A"}`);
        console.log(`│ Creator    : ${data.creator ?? "N/A"}`);
        console.log("├─────────────────────────────────────────────────────────────");
        console.log(`│ 📊 Latency : ${latencyUs} μs`);
        console.log(`│ 📊 Creates : ${createCount}`);
        console.log("└─────────────────────────────────────────────────────────────\n");
        break;
      }
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
