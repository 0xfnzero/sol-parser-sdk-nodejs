/**
 * PumpSwap — gRPC 订阅，按 sol-parser-sdk（Rust `DexEvent` + `serde`）语义输出标准 JSON
 *
 * 使用 `parseDexEventsFromGrpcTransactionInfo`（日志解析 + 与 Rust gRPC 相同的账户填充），
 * 再 `dexEventToJsonString(ev, 2)` 输出，与 Rust `serde_json::to_string_pretty` 语义一致
 *
 * 运行（在包根目录，无需先 build）:
 *   npx tsx examples/pumpswap_grpc_json.ts
 *
 * 环境变量:
 *   GRPC_URL / GRPC_TOKEN（优先），兼容 GEYSER_*；未设 token 时使用与 scripts/test-grpc-ts.ts 相同的 public 默认
 *   MAX_EVENTS  打印这么多条后退出；默认 0 = 一直打印，Ctrl+C 结束；设为正整数则凑满条数后退出
 */

import {
  YellowstoneGrpc,
  parseDexEventsFromGrpcTransactionInfo,
  dexEventToJsonString,
} from "../src/index.js";

const DEFAULT_PUBLIC_TOKEN =
  "313bdb5b6a19cc57bcccbfdb90e412f92c8ef7d30914d1dbb5730d42e060bea3";
const ENDPOINT =
  process.env.GRPC_URL ||
  process.env.GEYSER_ENDPOINT ||
  "https://solana-yellowstone-grpc.publicnode.com:443";
const X_TOKEN =
  process.env.GRPC_TOKEN ||
  process.env.GEYSER_API_TOKEN ||
  DEFAULT_PUBLIC_TOKEN;

const PROGRAM_IDS = ["pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA"];

const MAX_EVENTS = (() => {
  const raw = process.env.MAX_EVENTS;
  if (raw === undefined || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
})();

let printed = 0;
let resolveDone;
const finished = new Promise((r) => {
  resolveDone = r;
});

function matches(ev) {
  const k = Object.keys(ev)[0];
  return k && k.startsWith("PumpSwap");
}

const filter = {
  account_include: PROGRAM_IDS,
  account_exclude: [],
  account_required: [],
  vote: false,
  failed: false,
};

async function main() {
  console.log("=== PumpSwap gRPC → JSON（DexEvent 标准结构）===\n");
  console.log(`Endpoint: ${ENDPOINT}`);
  if (MAX_EVENTS > 0) {
    console.log(`Stop after ${MAX_EVENTS} events.\n`);
  } else {
    console.log("Printing continuously until Ctrl+C.\n");
  }

  const client = new YellowstoneGrpc(ENDPOINT, X_TOKEN);

  const sub = await client.subscribeTransactions(filter, {
    onUpdate: (update) => {
      if (!update.transaction?.transaction) return;
      const txInfo = update.transaction.transaction;
      const slot = update.transaction.slot;
      if (!txInfo.transactionRaw || !txInfo.metaRaw) return;

      const events = parseDexEventsFromGrpcTransactionInfo(txInfo, slot, undefined);

      for (const ev of events) {
        if (!matches(ev)) continue;
        printed++;
        console.log(`--- Event #${printed} slot=${slot} ---`);
        console.log(dexEventToJsonString(ev, 2));
        console.log();
        if (MAX_EVENTS > 0 && printed >= MAX_EVENTS) {
          resolveDone();
          return;
        }
      }
    },
    onError: (err) => {
      console.error("Stream error:", err.message);
      resolveDone();
    },
    onEnd: () => {
      console.log("Stream ended");
      resolveDone();
    },
  });

  process.once("SIGINT", () => {
    console.log("\n(interrupted)");
    resolveDone();
  });

  await finished;
  client.unsubscribe(sub.id);
  console.log(`Done. Printed ${printed} PumpSwap JSON event(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
