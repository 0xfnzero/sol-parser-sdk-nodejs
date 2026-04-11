/**
 * 调试：打印收到的 update 结构，确认 logMessages 位置
 *
 * 在包根目录: npx tsx scripts/debug-grpc-ts.ts
 * 或: npm run debug:grpc
 */

import { YellowstoneGrpc } from "../src/index.js";

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
