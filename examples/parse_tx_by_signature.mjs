/**
 * Parse Transaction by RPC Signature
 *
 * Demonstrates parsing a specific transaction from Solana RPC.
 * Usage: TX_SIGNATURE=<sig> node examples/parse_tx_by_signature.mjs
 *
 * Example:
 *   TX_SIGNATURE=5Yw...abc node examples/parse_tx_by_signature.mjs
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const {
  parseTransactionFromRpc,
  dexEventToJsonString,
} = require(path.join(__dirname, "../dist/index.js"));

// Example PumpFun tx signatures for testing
const DEFAULT_PUMPFUN_TX = process.env.TX_SIGNATURE || "5JGAxBahnJnSwqVfivWCSt7gy7Dtx9Dg9a2ZJeNPHHMEEEtUaTKwjWB2FEr1sMGScTN2bEf9bkpUfcLhwmBbx3Z";
const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";

async function fetchTransaction(signature) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [
        signature,
        { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
      ],
    }),
  });
  const json = await response.json();
  return json.result;
}

async function main() {
  const sig = DEFAULT_PUMPFUN_TX;
  console.log("🔍 Parse Transaction by RPC Signature");
  console.log("======================================\n");
  console.log(`Signature: ${sig}`);
  console.log(`RPC URL  : ${RPC_URL}\n`);

  console.log("Fetching transaction from RPC...");
  const tx = await fetchTransaction(sig);

  if (!tx) {
    console.error("Transaction not found. Try a different signature.");
    process.exit(1);
  }

  const logs = tx?.meta?.logMessages ?? [];
  console.log(`Log messages: ${logs.length}`);

  const { parseLogsOnly } = require(path.join(__dirname, "../dist/index.js"));
  const slot = tx.slot ?? 0;
  const events = parseLogsOnly(logs, sig, Number(slot), undefined);

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
