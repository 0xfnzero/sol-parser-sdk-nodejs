/**
 * Parse Transaction by RPC Signature
 *
 * 使用 `parseTransactionFromRpc`：拉取完整 RPC 交易并走 `parseRpcTransaction`
 *（指令 + 日志 + 账户填充），与仅 `parseLogsOnly` 的轻量路径不同。
 *
 * Usage: TX_SIGNATURE=<sig> npx tsx examples/parse_tx_by_signature.ts
 *
 * Example:
 *   TX_SIGNATURE=5Yw...abc RPC_URL=https://api.mainnet-beta.solana.com npx tsx examples/parse_tx_by_signature.ts
 */

import { Connection } from "@solana/web3.js";
import {
  parseTransactionFromRpc,
  dexEventToJsonString,
  formatParseError,
} from "../src/index.js";

const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";

async function main() {
  const sig = process.env.TX_SIGNATURE;
  if (!sig) {
    console.error(
      "请设置 TX_SIGNATURE（Base58 交易签名）。示例:\n" +
        "  TX_SIGNATURE=<sig> npx tsx examples/parse_tx_by_signature.ts\n" +
        "  TX_SIGNATURE=<sig> RPC_URL=https://api.mainnet-beta.solana.com npx tsx examples/parse_tx_by_signature.ts"
    );
    process.exit(1);
  }
  console.log("🔍 Parse Transaction by RPC Signature");
  console.log("======================================\n");
  console.log(`Signature: ${sig}`);
  console.log(`RPC URL  : ${RPC_URL}\n`);

  const connection = new Connection(RPC_URL, "confirmed");

  console.log("Fetching & parsing via parseTransactionFromRpc...");
  const result = await parseTransactionFromRpc(connection, sig);

  if (!result.ok) {
    console.error("Parse failed:", formatParseError(result.error));
    process.exit(1);
  }

  const { events } = result;

  if (events.length === 0) {
    console.log("No DEX events found in this transaction.");
    console.log("Try a PumpFun/PumpSwap/Raydium/Orca transaction signature.");
    process.exit(0);
  }

  console.log(`\n✅ Found ${events.length} DEX event(s):\n`);
  for (const ev of events) {
    const key = Object.keys(ev)[0];
    console.log(`[${key}]`);
    try {
      console.log(dexEventToJsonString(ev));
    } catch {
      console.log(JSON.stringify(ev, null, 2));
    }
    console.log();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
