/**
 * 调试：打印收到的 update 结构，确认 logMessages 位置
 *
 * 在包根目录: npx tsx scripts/debug-grpc-ts.ts
 * 需 GRPC_URL / GRPC_TOKEN（推荐复制 `.env.example` 为 `.env` 并填写）
 */

import { YellowstoneGrpc } from "../src/index.js";
import { requireGrpcEnv } from "./grpc_env.js";

const { ENDPOINT, X_TOKEN } = requireGrpcEnv();

const PROGRAM_IDS = [
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
];

async function main() {
  const client = new YellowstoneGrpc(ENDPOINT, X_TOKEN);

  let resolveDone;
  const done = new Promise((r) => {
    resolveDone = r;
  });
  setTimeout(() => resolveDone(), 15000);

  const filter = {
    account_include: PROGRAM_IDS,
    account_exclude: [],
    account_required: [],
    vote: false,
    failed: false,
  };

  let count = 0;
  const sub = await client.subscribeTransactions(filter, {
    onUpdate: (update) => {
      if (count >= 2) return;
      if (!update.transaction?.transaction) return;
      count++;
      const txInfo = update.transaction.transaction;
      console.log("\n--- txInfo keys:", Object.keys(txInfo));
      console.log("metaRaw type:", typeof txInfo.metaRaw);
      if (txInfo.metaRaw) {
        console.log("metaRaw keys:", Object.keys(txInfo.metaRaw));
        const lm = txInfo.metaRaw.logMessages;
        console.log("logMessages type:", typeof lm, Array.isArray(lm) ? `array[${lm.length}]` : lm);
        if (Array.isArray(lm) && lm.length > 0) {
          console.log("first log:", lm[0]);
        }
      }
      if (count >= 2) {
        resolveDone();
      }
    },
    onError: (err) => {
      console.error("error:", err.message);
      resolveDone();
    },
    onEnd: () => resolveDone(),
  });

  await done;
  client.unsubscribe(sub.id);
}

main().catch(console.error);
