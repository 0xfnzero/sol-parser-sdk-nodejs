/**
 * 验证：onUpdate 内同步抛错不会打断 gRPC 流（应由 SDK 捕获并走 onError，后续仍能收消息）
 *
 * 用法（在包根目录，无需先 build）:
 *   npx tsx examples/grpc_onupdate_error_test.ts
 *
 * 环境变量（必填）: GRPC_URL / GRPC_TOKEN — 未设置则报错退出（推荐 `.env.example` → `.env`）
 */

import { YellowstoneGrpc } from "../src/index.js";
import { requireGrpcEnv } from "../scripts/grpc_env.js";

const { ENDPOINT, X_TOKEN } = requireGrpcEnv();

const PROGRAM_IDS = [
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", // PumpFun
];

const NEED_OK_AFTER_ERROR = 3;
const TIMEOUT_MS = 90_000;

let txWithData = 0;
let okAfterError = 0;
let sawDeliberateError = false;

async function main() {
  console.log("=== gRPC onUpdate 错误隔离测试 ===");
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(
    `期望: 第 1 笔含 transaction 的更新会同步 throw → onError；之后仍能收到 ≥${NEED_OK_AFTER_ERROR} 笔。\n`
  );

  const client = new YellowstoneGrpc(ENDPOINT, X_TOKEN);

  let resolveDone;
  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });

  const timeout = setTimeout(() => {
    console.error(
      `\n超时 ${TIMEOUT_MS / 1000}s：若从未出现「抛错后仍收到」，可能是网络/端点问题，或链上暂无匹配交易。`
    );
    resolveDone("timeout");
  }, TIMEOUT_MS);

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

      txWithData++;
      if (txWithData === 1) {
        throw new Error("deliberate sync throw in onUpdate (first tx)");
      }

      okAfterError++;
      const sig = Buffer.from(
        update.transaction.transaction.signature ?? []
      )
        .toString("base64")
        .slice(0, 12);
      console.log(
        `✓ 抛错后仍收到更新 #${okAfterError} (总第 ${txWithData} 笔 tx) sig≈${sig}...`
      );

      if (okAfterError >= NEED_OK_AFTER_ERROR) {
        clearTimeout(timeout);
        resolveDone("ok");
      }
    },
    onError: (err) => {
      if (
        err.message &&
        err.message.includes("deliberate sync throw in onUpdate")
      ) {
        sawDeliberateError = true;
        console.log(`→ onError（预期）: ${err.message}\n`);
      } else {
        console.error("Stream error:", err.message);
        clearTimeout(timeout);
        resolveDone("err");
      }
    },
    onEnd: () => {
      console.log("Stream ended");
      clearTimeout(timeout);
      resolveDone("end");
    },
  });

  console.log(`已订阅 id=${sub.id}，等待 PumpFun 交易...\n`);
  const result = await done;

  client.unsubscribe(sub.id);

  if (result === "ok" && sawDeliberateError && okAfterError >= NEED_OK_AFTER_ERROR) {
    console.log("\n=== 通过：onError 收到故意错误，且流未断，后续仍收到足够多笔 ===");
    process.exit(0);
  }

  console.error(
    `\n=== 未通过：sawDeliberateError=${sawDeliberateError} okAfterError=${okAfterError} result=${result} ===`
  );
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
