/**
 * TypeScript/Node.js 集成测试
 * 通过 GRPC_URL / GRPC_TOKEN 连接 Yellowstone gRPC，订阅 PumpFun/PumpSwap 交易并用 sol-parser-sdk 解析
 *
 * 在包根目录运行（无需先 build，直接跑源码）:
 *   npx tsx scripts/test-grpc-ts.ts
 *
 * 环境变量（必填）:
 *   GRPC_URL / GRPC_TOKEN — 未设置则报错退出（推荐：复制 `.env.example` 为 `.env` 并填写）
 *   MAX_EVENTS  解析满这么多条 DEX 事件后退出；默认 0 = 不限制（一直跑，除非 Ctrl+C / 流错误）
 *   TIMEOUT_MS   运行毫秒数后自动退出；默认 0 = 不超时。可与 MAX_EVENTS 同时设，先满足任一条件即退出
 *   JSON_PRETTY=1  多行缩进打印（与 Rust Debug 一样便于阅读；默认单行紧凑 JSON）
 *   JSON_MAX_CHARS  限制每条事件 JSON 字符数（调试用）；不设或 0 = 不截断，输出完整 dexEventToJsonString
 */

import {
  YellowstoneGrpc,
  parseDexEventsFromGrpcTransactionInfo,
  dexEventToJsonString,
} from "../src/index.js";
import { requireGrpcEnv } from "./grpc_env.js";

const { ENDPOINT, X_TOKEN } = requireGrpcEnv();

const PROGRAM_IDS = [
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", // PumpFun
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA", // PumpSwap
];

const MAX_EVENTS = (() => {
  const raw = process.env.MAX_EVENTS;
  if (raw === undefined || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
})();
const TIMEOUT_MS = (() => {
  const raw = process.env.TIMEOUT_MS;
  if (raw === undefined || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
})();

/** 0 或未设置 = 不截断（与 Rust 示例「看全量」一致；此前默认 400 字仅为省终端行宽） */
const JSON_MAX_CHARS = (() => {
  const raw = process.env.JSON_MAX_CHARS;
  if (raw === undefined || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
})();
const JSON_PRETTY = process.env.JSON_PRETTY === "1" || process.env.JSON_PRETTY === "true";

let txCount = 0;
let eventCount = 0;

async function main() {
  console.log("=== TypeScript gRPC Integration Test ===");
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Watching programs: ${PROGRAM_IDS.join(", ")}`);
  if (MAX_EVENTS > 0 && TIMEOUT_MS > 0) {
    console.log(
      `Stop after ${MAX_EVENTS} events or ${TIMEOUT_MS / 1000}s (whichever first). Ctrl+C to exit anytime.\n`
    );
  } else if (MAX_EVENTS > 0) {
    console.log(`Stop after ${MAX_EVENTS} parsed events. Ctrl+C to exit anytime.\n`);
  } else if (TIMEOUT_MS > 0) {
    console.log(`Stop after ${TIMEOUT_MS / 1000}s. Ctrl+C to exit anytime.\n`);
  } else {
    console.log("Running until you press Ctrl+C (or stream error / end).\n");
  }

  const client = new YellowstoneGrpc(ENDPOINT, X_TOKEN);

  let resolveDone;
  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });

  let timeoutId = null;
  if (TIMEOUT_MS > 0) {
    timeoutId = setTimeout(() => {
      console.log(`\nTimeout reached after ${TIMEOUT_MS / 1000}s`);
      resolveDone();
    }, TIMEOUT_MS);
  }

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
      if (!txInfo.transactionRaw || !txInfo.metaRaw) return;

      txCount++;
      const sigBytes = txInfo.signature ?? new Uint8Array(0);
      const sigHex = Buffer.from(sigBytes).toString("hex").slice(0, 16) + "...";

      const events = parseDexEventsFromGrpcTransactionInfo(txInfo, slot, undefined);
      if (events.length === 0) return;

      eventCount += events.length;
      console.log(`[tx#${txCount}] slot=${slot} sig=${sigHex} → ${events.length} event(s)`);
      for (const ev of events) {
        const key = Object.keys(ev)[0];
        console.log(`  ✓ ${key}`);
        try {
          let line = dexEventToJsonString(ev, JSON_PRETTY ? 2 : undefined);
          const fullLen = line.length;
          if (JSON_MAX_CHARS > 0 && fullLen > JSON_MAX_CHARS) {
            line =
              line.slice(0, JSON_MAX_CHARS) +
              `… (truncated, ${fullLen} chars; unset JSON_MAX_CHARS for full)`;
          }
          if (JSON_PRETTY) {
            console.log(line);
          } else {
            console.log(`    ${line}`);
          }
        } catch (_) {
          let line = JSON.stringify(ev);
          if (JSON_MAX_CHARS > 0 && line.length > JSON_MAX_CHARS) {
            line = line.slice(0, JSON_MAX_CHARS) + "…";
          }
          console.log(`    ${line}`);
        }
      }
      console.log();

      if (MAX_EVENTS > 0 && eventCount >= MAX_EVENTS) {
        if (timeoutId) clearTimeout(timeoutId);
        resolveDone();
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

  const shutdown = (reason) => {
    if (timeoutId) clearTimeout(timeoutId);
    client.unsubscribe(sub.id);
    console.log(
      `\n=== ${reason}: ${txCount} txs received, ${eventCount} DEX events parsed ===`
    );
  };

  process.once("SIGINT", () => {
    shutdown("Stopped by user (Ctrl+C)");
    process.exit(0);
  });

  console.log(`Subscribed (id=${sub.id}), waiting for data...\n`);
  await done;

  shutdown("Done");
  const ok = eventCount > 0 || txCount > 0;
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
