/**
 * PumpSwap — gRPC 订阅，按 sol-parser-sdk（Rust `DexEvent` + `serde`）语义输出标准 JSON
 *
 * 使用最新 `subscribeDexEvents` 队列（统一交易/账户解析 + 与 Rust gRPC 相同的账户填充），
 * 再用 `dexEventToJsonString(ev, 2)` 输出，与 Rust `serde_json::to_string_pretty` 语义一致
 *
 * 运行（在包根目录，无需先 build）:
 *   npx tsx examples/pumpswap_grpc_json.ts
 *
 * 环境变量（必填）:
 *   GRPC_URL / GRPC_TOKEN — 未设置则报错退出（推荐 `.env.example` → `.env`）
 *   MAX_EVENTS  打印这么多条后退出；默认 0 = 一直打印，Ctrl+C 结束；设为正整数则凑满条数后退出
 */

import {
  YellowstoneGrpc,
  dexEventToJsonString,
  transactionFilterForProtocols,
  type DexEvent,
} from "../src/index.js";
import { requireGrpcEnv } from "../scripts/grpc_env.js";

const { ENDPOINT, X_TOKEN } = requireGrpcEnv();

const MAX_EVENTS = (() => {
  const raw = process.env.MAX_EVENTS;
  if (raw === undefined || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
})();

let printed = 0;

function matches(ev: DexEvent): boolean {
  const k = Object.keys(ev)[0];
  return Boolean(k && k.startsWith("PumpSwap"));
}

async function main() {
  console.log("=== PumpSwap gRPC → JSON（DexEvent 标准结构）===\n");
  console.log(`Endpoint: ${ENDPOINT}`);
  if (MAX_EVENTS > 0) {
    console.log(`Stop after ${MAX_EVENTS} events.\n`);
  } else {
    console.log("Printing continuously until Ctrl+C.\n");
  }

  const client = new YellowstoneGrpc(ENDPOINT, X_TOKEN);
  const filter = transactionFilterForProtocols(["PumpSwap"]);
  const sub = await client.subscribeDexEvents([filter], []);
  let interrupted = false;

  (async () => {
    for await (const err of sub.errors) {
      console.error("Stream error:", err.message);
      sub.cancel();
    }
  })().catch((err) => console.error("Error stream failed:", err));

  process.once("SIGINT", () => {
    console.log("\n(interrupted)");
    interrupted = true;
    sub.cancel();
  });

  for await (const ev of sub) {
    if (!matches(ev)) continue;
    printed++;
    console.log(`--- Event #${printed} ---`);
    console.log(dexEventToJsonString(ev, 2));
    console.log();
    if (MAX_EVENTS > 0 && printed >= MAX_EVENTS) break;
  }

  sub.cancel();
  if (interrupted) {
    console.log(`Done. Printed ${printed} PumpSwap JSON event(s) before interrupt.`);
    return;
  }
  console.log(`Done. Printed ${printed} PumpSwap JSON event(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
