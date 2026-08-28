/**
 * PumpFun dev trades: CREATE + DEV BUY + DEV SELL on one low-latency stream.
 *
 * GRPC_URL and GRPC_TOKEN are read from the shell environment first, then
 * from the repository-root .env file when either value is not exported.
 *
 * Run from the repository root:
 *   GRPC_URL=... GRPC_TOKEN=... npx tsx examples/devtrades_low_latency.ts
 *
 * Optional limits:
 *   MAX_EVENTS=500 MAX_BUYS=20 MAX_SELLS=20 npx tsx examples/devtrades_low_latency.ts
 */

import {
  YellowstoneGrpc,
  eventTypeFilterIncludeOnly,
  lowLatencyClientConfig,
  transactionFilterForProtocols,
  type DexEvent,
} from "../src/index.js";
import { requireGrpcEnv } from "../scripts/grpc_env.js";

const { ENDPOINT, X_TOKEN } = requireGrpcEnv();

const MAX_EVENTS = Number(process.env.MAX_EVENTS ?? 0);
const MAX_DEV_BUYS = Number(process.env.MAX_BUYS ?? 0);
const MAX_DEV_SELLS = Number(process.env.MAX_SELLS ?? 0);

type EventData = Record<string, any>;

const devByMint = new Map<string, string>();

let totalEvents = 0;
let createCount = 0;
let buyCount = 0;
let sellCount = 0;
let devBuyCount = 0;
let devSellCount = 0;
let buyCacheMiss = 0;
let sellCacheMiss = 0;
let stopped = false;
let latestSlot = 0n;
let latestQueueLatencyUs = 0;
let latestParseDurationUs = 0;
let latestProcessingLatencyUs = 0;

function getEvent(ev: DexEvent): { key: string; data: EventData } {
  const key = Object.keys(ev)[0] ?? "";
  const raw = (ev as unknown as Record<string, unknown>)[key];
  return {
    key,
    data: raw && typeof raw === "object" ? (raw as EventData) : {},
  };
}

function metadata(data: EventData) {
  return (data.metadata ?? {}) as {
    grpc_recv_us?: number;
    signature?: string;
    slot?: number | bigint;
    local_queue_latency_us?: number;
    parse_duration_us?: number;
    local_processing_latency_us?: number;
  };
}

function short(value: unknown, length = 12): string {
  const text = String(value ?? "");
  if (!text) return "N/A";
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

async function main() {
  console.log("==============================================");
  console.log(" PumpFun CREATE + DEV BUY + DEV SELL");
  console.log("==============================================");
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log("Logic: CREATE -> mint/dev Map -> BUY/SELL user===dev");
  console.log("One low-latency stream | DB: none | RPC: none\n");

  const config = lowLatencyClientConfig();
  config.enable_metrics = true;
  const client = new YellowstoneGrpc(ENDPOINT, X_TOKEN, config);
  const txFilter = transactionFilterForProtocols(["PumpFun"]);
  const eventFilter = eventTypeFilterIncludeOnly([
    "PumpFunCreate",
    "PumpFunCreateV2",
    "PumpFunBuy",
    "PumpFunSell",
  ]);

  const sub = await client.subscribeDexEvents([txFilter], [], eventFilter, {
    // Bound latency during overload. Replacements are observable through
    // sub.dropped() and sub.errors, so event loss is never silent.
    queueOverflowStrategy: "drop-oldest",
  });

  void (async () => {
    for await (const err of sub.errors) {
      console.error(`[STREAM] ${err.message}`);
    }
  })().catch((err) => console.error("Error stream failed:", err));

  const healthTimer = setInterval(() => {
    console.log(
      `[HEALTH] slot=${latestSlot} queue=${sub.len()}/${config.buffer_size} ` +
        `dropped=${sub.dropped()} queue_us=${latestQueueLatencyUs.toFixed(1)} ` +
        `parse_us=${latestParseDurationUs.toFixed(1)} ` +
        `grpc_to_parsed_us=${latestProcessingLatencyUs.toFixed(1)} ` +
        `events=${totalEvents}`
    );
  }, 10_000);
  healthTimer.unref();

  console.log(`Subscribed: ${sub.id}`);
  console.log("Waiting for CREATE / DEV BUY / DEV SELL...\n");

  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(healthTimer);
    sub.cancel();

    console.log("\n==============================================");
    console.log("FINAL STATS");
    console.log("==============================================");
    console.log(`Events:            ${totalEvents}`);
    console.log(`Creates:           ${createCount}`);
    console.log(`Buys (all):        ${buyCount}`);
    console.log(`Dev buys:          ${devBuyCount}`);
    console.log(`Buy cache misses:  ${buyCacheMiss}`);
    console.log(`Sells (all):       ${sellCount}`);
    console.log(`Dev sells:         ${devSellCount}`);
    console.log(`Sell cache misses: ${sellCacheMiss}`);
    console.log(`Tracked map:       ${devByMint.size}`);
    console.log(`Queue dropped:     ${sub.dropped()}`);
    console.log("==============================================");
  };

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  for await (const ev of sub) {
    totalEvents++;

    const { key, data } = getEvent(ev);
    const meta = metadata(data);
    const signature = meta.signature ?? "";
    const slot = BigInt(meta.slot ?? 0);
    if (slot > latestSlot) latestSlot = slot;
    latestQueueLatencyUs = meta.local_queue_latency_us ?? latestQueueLatencyUs;
    latestParseDurationUs = meta.parse_duration_us ?? latestParseDurationUs;
    latestProcessingLatencyUs = meta.local_processing_latency_us ?? latestProcessingLatencyUs;

    // CREATE
    if (key === "PumpFunCreate" || key === "PumpFunCreateV2") {
      const mint = String(data.mint ?? "");
      const creator = String(data.creator ?? "");

      if (mint && creator) {
        devByMint.set(mint, creator);
        createCount++;

        console.log("CREATE");
        console.log(`   type      : ${key}`);
        console.log(`   mint      : ${mint}`);
        console.log(`   creator   : ${creator}`);
        console.log(`   signature : ${signature}`);
        console.log(`   slot      : ${slot}`);
        console.log(`   tracked   : ${devByMint.size}\n`);
      } else {
        console.warn("CREATE missing mint/creator:", key, data);
      }
    }

    // BUY
    if (key === "PumpFunBuy") {
      buyCount++;

      const mint = String(data.mint ?? "");
      const user = String(data.user ?? "");
      const dev = devByMint.get(mint);

      if (!dev) {
        buyCacheMiss++;
      } else if (user === dev) {
        devBuyCount++;

        console.log("DEV BUY DETECTED");
        console.log(`   mint        : ${mint}`);
        console.log(`   dev         : ${dev}`);
        console.log(`   user        : ${user}`);
        console.log(`   token amount: ${data.token_amount ?? 0}`);
        console.log(`   SOL amount  : ${data.sol_amount ?? 0} lamports`);
        console.log(`   signature   : ${signature}`);
        console.log(`   slot        : ${slot}`);
        console.log(`   dev buy #   : ${devBuyCount}\n`);

        if (devBuyCount === 1) {
          console.log("========== RAW FIRST DEV BUY ==========");
          console.dir(data, { depth: null });
          console.log("=======================================\n");
        }

        if (MAX_DEV_BUYS > 0 && devBuyCount >= MAX_DEV_BUYS) {
          stop();
          return;
        }
      }

      if (buyCount <= 20 && dev !== user) {
        console.log(
          `BUY  mint=${short(mint)} user=${short(user)} ` +
            `trackedDev=${dev ? short(dev) : "NO"}`
        );
      }
    }

    // SELL
    if (key === "PumpFunSell") {
      sellCount++;

      const mint = String(data.mint ?? "");
      const user = String(data.user ?? "");
      const dev = devByMint.get(mint);

      if (!dev) {
        sellCacheMiss++;
      } else if (user === dev) {
        devSellCount++;

        console.log("DEV SELL DETECTED");
        console.log(`   mint        : ${mint}`);
        console.log(`   dev         : ${dev}`);
        console.log(`   user        : ${user}`);
        console.log(`   token amount: ${data.token_amount ?? 0}`);
        console.log(`   SOL amount  : ${data.sol_amount ?? 0} lamports`);
        console.log(`   signature   : ${signature}`);
        console.log(`   slot        : ${slot}`);
        console.log(`   dev sell #  : ${devSellCount}\n`);

        if (MAX_DEV_SELLS > 0 && devSellCount >= MAX_DEV_SELLS) {
          stop();
          return;
        }
      }

      if (sellCount <= 20 && dev !== user) {
        console.log(
          `SELL mint=${short(mint)} user=${short(user)} ` +
            `trackedDev=${dev ? short(dev) : "NO"}`
        );
      }
    }

    if (MAX_EVENTS > 0 && totalEvents >= MAX_EVENTS) {
      stop();
      return;
    }
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exitCode = 1;
});
