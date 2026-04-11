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

import bs58 from "bs58";
import { YellowstoneGrpc, parseLogsOnly, grpcTxIndexFromInfo, nowUs } from "../src/index.js";
import { requireGrpcEnv } from "../scripts/grpc_env.js";

const { ENDPOINT, X_TOKEN } = requireGrpcEnv();

// PumpFun program ID
const PROGRAM_IDS = ["6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"];

let eventCount = 0;
let buyCount = 0;
let sellCount = 0;
let buyExactCount = 0;
let createCount = 0;

async function main() {
  console.log("🚀 PumpFun Trade Event Filter Example");
  console.log("======================================\n");
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
      const events = parseLogsOnly(logs, sig, Number(slot), undefined, grpcTxIndexFromInfo(txInfo));

      for (const ev of events) {
        const key = Object.keys(ev)[0];
        if (!key.startsWith("PumpFun")) continue;

        const data = ev[key];
        const parseEndUs = data?.metadata?.grpc_recv_us ?? 0;
        const latencyUs = parseEndUs > 0 ? parseEndUs - t0 : 0;
        eventCount++;

        switch (key) {
          case "PumpFunBuy":
          case "PumpFunBuyExactSolIn": {
            if (key === "PumpFunBuy") buyCount++;
            else buyExactCount++;
            console.log("┌─────────────────────────────────────────────────────────────");
            console.log(`│ 🟢 ${key} #${eventCount}`);
            console.log("├─────────────────────────────────────────────────────────────");
            console.log(`│ Signature  : ${sig}`);
            console.log(`│ Slot       : ${slot}`);
            console.log("├─────────────────────────────────────────────────────────────");
            console.log(`│ Mint       : ${data?.mint ?? "N/A"}`);
            console.log(`│ SOL Amount : ${data?.sol_amount ?? 0} lamports`);
            console.log(`│ Token Amt  : ${data?.token_amount ?? 0}`);
            console.log(`│ User       : ${data?.user ?? "N/A"}`);
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
            console.log(`│ Signature  : ${sig}`);
            console.log(`│ Slot       : ${slot}`);
            console.log("├─────────────────────────────────────────────────────────────");
            console.log(`│ Mint       : ${data?.mint ?? "N/A"}`);
            console.log(`│ SOL Amount : ${data?.sol_amount ?? 0} lamports`);
            console.log(`│ Token Amt  : ${data?.token_amount ?? 0}`);
            console.log(`│ User       : ${data?.user ?? "N/A"}`);
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
            console.log(`│ Signature  : ${sig}`);
            console.log(`│ Slot       : ${slot}`);
            console.log("├─────────────────────────────────────────────────────────────");
            console.log(`│ Name       : ${data?.name ?? "N/A"}`);
            console.log(`│ Symbol     : ${data?.symbol ?? "N/A"}`);
            console.log(`│ Mint       : ${data?.mint ?? "N/A"}`);
            console.log(`│ Creator    : ${data?.creator ?? "N/A"}`);
            console.log("├─────────────────────────────────────────────────────────────");
            console.log(`│ 📊 Latency : ${latencyUs} μs`);
            console.log(`│ 📊 Creates : ${createCount}`);
            console.log("└─────────────────────────────────────────────────────────────\n");
            break;
          }
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
    console.log(`\n👋 Total events: ${eventCount} (Buy=${buyCount} Sell=${sellCount} BuyExact=${buyExactCount} Create=${createCount})`);
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
