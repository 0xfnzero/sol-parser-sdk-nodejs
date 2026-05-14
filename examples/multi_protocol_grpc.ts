/**
 * Multi-Protocol gRPC Example
 *
 * Demonstrates subscribing to multiple DEX protocols simultaneously:
 * PumpFun, PumpSwap, Raydium, Orca, Meteora, Bonk
 *
 * Run: npx tsx examples/multi_protocol_grpc.ts（先在包根目录配置 `.env`，见 `.env.example`）
 * （GRPC_URL / GRPC_TOKEN 必填，未设置则退出）
 */

import {
  YellowstoneGrpc,
  accountFilterForProtocols,
  defaultClientConfig,
  dexEventToJsonString,
  transactionFilterForProtocols,
  type DexEvent,
  type Protocol,
} from "../src/index.js";
import { requireGrpcEnv } from "../scripts/grpc_env.js";

const { ENDPOINT, X_TOKEN } = requireGrpcEnv();

// 与 Rust `grpc::types::Protocol` / `PROTOCOL_PROGRAM_IDS` 覆盖范围一致。
const PROTOCOLS = [
  "PumpFun",
  "PumpSwap",
  "Bonk",
  "RaydiumCpmm",
  "RaydiumClmm",
  "RaydiumAmmV4",
  "MeteoraDammV2",
] as const satisfies readonly Protocol[];

const stats: Record<string, number> = {};

function eventEntry(ev: DexEvent): [string, Record<string, unknown>] {
  const key = Object.keys(ev)[0];
  const value = (ev as unknown as Record<string, unknown>)[key];
  return [key, value && typeof value === "object" ? (value as Record<string, unknown>) : {}];
}

async function main() {
  console.log("🚀 Multi-Protocol gRPC Example");
  console.log("================================\n");
  console.log(`📡 Endpoint: ${ENDPOINT}`);
  console.log(`📊 Protocols: ${PROTOCOLS.join(", ")}\n`);

  const config = defaultClientConfig();
  config.enable_metrics = true;
  config.order_mode = "Unordered";

  const client = new YellowstoneGrpc(ENDPOINT, X_TOKEN, config);
  const txFilter = transactionFilterForProtocols(PROTOCOLS);
  const accountFilter = accountFilterForProtocols(PROTOCOLS);

  const sub = await client.subscribeDexEvents([txFilter], [accountFilter]);

  (async () => {
    for await (const err of sub.errors) {
      console.error("Stream error:", err.message);
    }
  })().catch((err) => console.error("Error stream failed:", err));

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
    sub.cancel();
    console.log("\n📊 Final Event Statistics:");
    for (const [k, v] of Object.entries(stats).sort(
      (a, b) => Number(b[1]) - Number(a[1])
    )) {
      console.log(`  ${k.padEnd(35)}: ${v}`);
    }
    process.exit(0);
  });

  for await (const ev of sub) {
    const [key, data] = eventEntry(ev);
    stats[key] = (stats[key] || 0) + 1;

    const metadata = data.metadata as
      | { signature?: string; slot?: number | bigint }
      | undefined;
    console.log(`[${new Date().toISOString()}] ${key}`);
    console.log(`  sig  : ${metadata?.signature ?? ""} | slot: ${metadata?.slot ?? ""}`);
    if (data.mint) console.log(`  mint : ${data.mint}`);
    if (data.pool) console.log(`  pool : ${data.pool}`);
    if (data.user) console.log(`  user : ${data.user}`);
    if (data.sol_amount !== undefined) console.log(`  sol  : ${data.sol_amount} lamports`);
    if (data.token_amount !== undefined) console.log(`  token: ${data.token_amount}`);
    console.log(`  json : ${dexEventToJsonString(ev)}`);
    console.log();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
