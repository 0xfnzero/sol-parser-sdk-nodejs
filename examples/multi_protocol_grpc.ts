/**
 * Multi-Protocol gRPC Example
 *
 * Demonstrates subscribing to multiple DEX protocols simultaneously:
 * PumpFun, PumpSwap, Raydium, Orca, Meteora, Bonk
 *
 * Run: npx tsx examples/multi_protocol_grpc.ts（先在包根目录配置 `.env`，见 `.env.example`）
 * （GRPC_URL / GRPC_TOKEN 必填，未设置则退出）
 */

import bs58 from "bs58";
import { YellowstoneGrpc, parseLogsOnly, grpcTxIndexFromInfo } from "../src/index.js";
import { requireGrpcEnv } from "../scripts/grpc_env.js";

const { ENDPOINT, X_TOKEN } = requireGrpcEnv();

// 与 `src/instr/program_ids.ts` 对齐（原 Eo7Wj… / BUZ… 为错误地址）
const PROGRAM_IDS = [
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", // PumpFun
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA", // PumpSwap
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium AMM V4
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK", // Raydium CLMM
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C", // Raydium CPMM
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", // Orca Whirlpool
  "cpamdpZCGKUy5JxQXB2MWgCm3hcnGjEJbYTJgfm4E8a", // Meteora DAMM V2
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo", // Meteora DLMM
  "LanCh3hDdY7M6x8urBSLJhsQBgPNGKHNqJqGwzAEmBm", // Bonk Launchpad（与 program_ids.BONK_LAUNCHPAD_PROGRAM_ID 一致）
];

const stats = {};

async function main() {
  console.log("🚀 Multi-Protocol gRPC Example");
  console.log("================================\n");
  console.log(`📡 Endpoint: ${ENDPOINT}`);
  console.log(`📊 Protocols: PumpFun, PumpSwap, Raydium, Orca, Meteora, Bonk\n`);

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
        stats[key] = (stats[key] || 0) + 1;

        const data = ev[key];
        console.log(`[${new Date().toISOString()}] ${key}`);
        console.log(`  sig  : ${sig} | slot: ${slot}`);
        if (data?.mint) console.log(`  mint : ${data.mint}`);
        if (data?.pool) console.log(`  pool : ${data.pool}`);
        if (data?.user) console.log(`  user : ${data.user}`);
        if (data?.sol_amount !== undefined) console.log(`  sol  : ${data.sol_amount} lamports`);
        if (data?.token_amount !== undefined) console.log(`  token: ${data.token_amount}`);
        console.log();
      }
    },
    onError: (err) => console.error("Stream error:", err.message),
    onEnd: () => console.log("Stream ended"),
  });

  console.log(`✅ Subscribed (id=${sub.id})`);
  console.log("🛑 Press Ctrl+C to stop...\n");

  // Print stats every 30 seconds
  setInterval(() => {
    if (Object.keys(stats).length === 0) return;
    console.log("\n📊 Event Statistics:");
    for (const [k, v] of Object.entries(stats).sort(
      (a, b) => Number(b[1]) - Number(a[1])
    )) {
      console.log(`  ${k.padEnd(35)}: ${v}`);
    }
    console.log();
  }, 30000);

  process.on("SIGINT", () => {
    client.unsubscribe(sub.id);
    console.log("\n📊 Final Event Statistics:");
    for (const [k, v] of Object.entries(stats).sort(
      (a, b) => Number(b[1]) - Number(a[1])
    )) {
      console.log(`  ${k.padEnd(35)}: ${v}`);
    }
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
