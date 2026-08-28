/**
 * PumpFun creation/dev trades plus full-volume PumpSwap trades and liquidity.
 *
 * Run from the repository root:
 *   GRPC_URL=... GRPC_TOKEN=... npx tsx examples/devtrades_pumpfun_pumpswap_low_latency.ts
 */

import {
  YellowstoneGrpc,
  eventTypeFilterIncludeOnly,
  lowLatencyClientConfig,
  transactionFilterForProtocolAccounts,
  transactionFilterForProtocols,
  type DexEvent,
  type TransactionFilter,
} from "../src/index.js";
import { requireGrpcEnv } from "../scripts/grpc_env.js";

const { ENDPOINT, X_TOKEN } = requireGrpcEnv();
const FILTER_UPDATE_DEBOUNCE_MS = Number(process.env.FILTER_UPDATE_DEBOUNCE_MS ?? 100);
const PUMPSWAP_ACCOUNTS_PER_FILTER = Number(process.env.PUMPSWAP_ACCOUNTS_PER_FILTER ?? 50);
const PUMPSWAP_FILTER_MODE = process.env.PUMPSWAP_FILTER_MODE ?? "full";
// Full-volume mode keeps every observed creator mapping by default. Scoped mode
// remains bounded because each retained mint expands the server-side filters.
const MAX_TRACKED_MINTS = Number(
  process.env.MAX_TRACKED_MINTS ?? (PUMPSWAP_FILTER_MODE === "scoped" ? 100 : 0)
);

type EventData = Record<string, unknown>;

const devByMint = new Map<string, string>();
const mintByPool = new Map<string, string>();
const poolsByMint = new Map<string, Set<string>>();
const pinnedPumpSwapAccounts = new Set<string>();
const pumpSwapAccounts = new Set<string>();

for (const account of (process.env.PUMPSWAP_TRACKED_ACCOUNTS ?? "").split(",")) {
  const trimmed = account.trim();
  if (trimmed) {
    pinnedPumpSwapAccounts.add(trimmed);
    pumpSwapAccounts.add(trimmed);
  }
}

let latestSlot = 0n;
let latestQueueLatencyUs = 0;
let latestParseDurationUs = 0;
let latestProcessingLatencyUs = 0;
let latestSourceToGrpcLatencyUs = 0;
let totalEvents = 0;
let devTradeCount = 0;
let devPoolCreateCount = 0;
let devLiquidityAddCount = 0;
let stopped = false;

function eventEntry(event: DexEvent): [string, EventData] {
  const name = Object.keys(event)[0] ?? "";
  const value = (event as unknown as Record<string, unknown>)[name];
  return [name, value && typeof value === "object" ? (value as EventData) : {}];
}

function stringField(data: EventData, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value : "";
}

function removePumpSwapAccount(account: string): void {
  if (!pinnedPumpSwapAccounts.has(account)) pumpSwapAccounts.delete(account);
}

function rememberDeveloper(mint: string, creator: string): boolean {
  let filtersChanged = !pumpSwapAccounts.has(mint);

  // Map insertion order is the retention order. Refresh an existing mint when
  // another create event for it is observed.
  devByMint.delete(mint);
  devByMint.set(mint, creator);
  pumpSwapAccounts.add(mint);

  while (MAX_TRACKED_MINTS > 0 && devByMint.size > MAX_TRACKED_MINTS) {
    const oldestMint = devByMint.keys().next().value as string | undefined;
    if (!oldestMint) break;
    devByMint.delete(oldestMint);
    removePumpSwapAccount(oldestMint);
    for (const pool of poolsByMint.get(oldestMint) ?? []) {
      mintByPool.delete(pool);
      removePumpSwapAccount(pool);
    }
    poolsByMint.delete(oldestMint);
    filtersChanged = true;
  }

  return filtersChanged;
}

function rememberPool(mint: string, pool: string): boolean {
  if (!devByMint.has(mint)) return false;

  const previousMint = mintByPool.get(pool);
  if (previousMint && previousMint !== mint) poolsByMint.get(previousMint)?.delete(pool);
  mintByPool.set(pool, mint);

  let pools = poolsByMint.get(mint);
  if (!pools) {
    pools = new Set<string>();
    poolsByMint.set(mint, pools);
  }
  pools.add(pool);

  if (pumpSwapAccounts.has(pool)) return false;
  pumpSwapAccounts.add(pool);
  return true;
}

function trackedMintForPumpSwap(data: EventData): string {
  const poolMint = mintByPool.get(stringField(data, "pool"));
  if (poolMint && devByMint.has(poolMint)) return poolMint;

  const baseMint = stringField(data, "base_mint");
  if (baseMint && devByMint.has(baseMint)) return baseMint;

  const quoteMint = stringField(data, "quote_mint");
  if (quoteMint && devByMint.has(quoteMint)) return quoteMint;

  return "";
}

function pumpSwapFilters(): TransactionFilter[] {
  const accounts = [...pumpSwapAccounts];
  const filters: TransactionFilter[] = [];
  for (let offset = 0; offset < accounts.length; offset += PUMPSWAP_ACCOUNTS_PER_FILTER) {
    filters.push(
      transactionFilterForProtocolAccounts(
        "PumpSwap",
        accounts.slice(offset, offset + PUMPSWAP_ACCOUNTS_PER_FILTER)
      )
    );
  }
  return filters;
}

async function main(): Promise<void> {
  if (
    PUMPSWAP_FILTER_MODE === "scoped" &&
    (!Number.isInteger(PUMPSWAP_ACCOUNTS_PER_FILTER) || PUMPSWAP_ACCOUNTS_PER_FILTER < 1)
  ) {
    throw new RangeError("PUMPSWAP_ACCOUNTS_PER_FILTER must be a positive integer");
  }
  if (!Number.isInteger(MAX_TRACKED_MINTS) || MAX_TRACKED_MINTS < 0) {
    throw new RangeError("MAX_TRACKED_MINTS must be a non-negative integer");
  }
  if (PUMPSWAP_FILTER_MODE !== "full" && PUMPSWAP_FILTER_MODE !== "scoped") {
    throw new RangeError("PUMPSWAP_FILTER_MODE must be full or scoped");
  }

  const config = lowLatencyClientConfig();
  config.enable_metrics = true;
  const client = new YellowstoneGrpc(ENDPOINT, X_TOKEN, config);
  const pumpFunFilter = transactionFilterForProtocols(["PumpFun"]);
  const fullPumpFilter = transactionFilterForProtocols(["PumpFun", "PumpSwap"]);
  const subscriptionFilters = () =>
    PUMPSWAP_FILTER_MODE === "full"
      ? [fullPumpFilter]
      : [pumpFunFilter, ...pumpSwapFilters()];
  const eventFilter = eventTypeFilterIncludeOnly([
    "PumpFunCreate",
    "PumpFunCreateV2",
    "PumpFunBuy",
    "PumpFunSell",
    "PumpFunMigrate",
    "PumpSwapBuy",
    "PumpSwapSell",
    "PumpSwapCreatePool",
    "PumpSwapLiquidityAdded",
  ]);

  const sub = await client.subscribeDexEvents(
    subscriptionFilters(),
    [],
    eventFilter,
    {
      queueOverflowStrategy: "drop-oldest",
    }
  );

  let filterUpdateTimer: ReturnType<typeof setTimeout> | undefined;
  let filterUpdateRunning = false;
  let filterUpdatePending = false;

  const flushFilterUpdate = async () => {
    filterUpdateTimer = undefined;
    if (filterUpdateRunning || stopped) return;
    filterUpdateRunning = true;
    try {
      do {
        filterUpdatePending = false;
        await client.updateSubscription(subscriptionFilters(), []);
      } while (filterUpdatePending && !stopped);
    } catch (error) {
      console.error(`[FILTER] ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      filterUpdateRunning = false;
      if (filterUpdatePending && !stopped && !filterUpdateTimer) {
        filterUpdateTimer = setTimeout(() => void flushFilterUpdate(), FILTER_UPDATE_DEBOUNCE_MS);
      }
    }
  };

  const scheduleFilterUpdate = () => {
    if (PUMPSWAP_FILTER_MODE === "full") return;
    filterUpdatePending = true;
    if (filterUpdateRunning || filterUpdateTimer || stopped) return;
    filterUpdateTimer = setTimeout(() => void flushFilterUpdate(), FILTER_UPDATE_DEBOUNCE_MS);
  };

  void (async () => {
    for await (const error of sub.errors) console.error(`[STREAM] ${error.message}`);
  })();

  const healthTimer = setInterval(() => {
    console.log(
      `[HEALTH] slot=${latestSlot} events=${totalEvents} ` +
        `event_queue=${sub.len()}/${config.buffer_size} ingress_queue=${sub.ingressLen()} ` +
        `event_dropped=${sub.eventDropped()} ingress_dropped=${sub.ingressDropped()} ` +
        `connected=${sub.isStreamConnected()} disconnects=${sub.streamDisconnects()} ` +
        `reconnects=${sub.reconnects()} replayed=${sub.replayedUpdates()} ` +
        `continuity_breaks=${sub.continuityBreaks()} ` +
        `queue_us=${latestQueueLatencyUs.toFixed(1)} parse_us=${latestParseDurationUs.toFixed(1)} ` +
        `grpc_to_parsed_us=${latestProcessingLatencyUs.toFixed(1)} ` +
        `source_to_grpc_us=${latestSourceToGrpcLatencyUs.toFixed(1)} ` +
        `tracked_mints=${devByMint.size} ` +
        `tracked_accounts=${pumpSwapAccounts.size}`
    );
  }, 10_000);
  healthTimer.unref();

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (filterUpdateTimer) clearTimeout(filterUpdateTimer);
    clearInterval(healthTimer);
    sub.cancel();
    console.log(
      `[FINAL] events=${totalEvents} dev_trades=${devTradeCount} ` +
        `dev_pool_creates=${devPoolCreateCount} dev_liquidity_adds=${devLiquidityAddCount} ` +
        `dropped=${sub.dropped()}`
    );
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  console.log(
    `Subscribed to ${ENDPOINT} (id=${sub.id}, PumpSwap filter=${PUMPSWAP_FILTER_MODE})`
  );

  for await (const event of sub) {
    totalEvents++;
    const [name, data] = eventEntry(event);
    const metadata = data.metadata as
      | {
          signature?: string;
          slot?: number | bigint;
          local_queue_latency_us?: number;
          parse_duration_us?: number;
          local_processing_latency_us?: number;
          source_to_grpc_latency_us?: number;
        }
      | undefined;
    const slot = BigInt(metadata?.slot ?? 0);
    if (slot > latestSlot) latestSlot = slot;
    latestQueueLatencyUs = metadata?.local_queue_latency_us ?? latestQueueLatencyUs;
    latestParseDurationUs = metadata?.parse_duration_us ?? latestParseDurationUs;
    latestProcessingLatencyUs =
      metadata?.local_processing_latency_us ?? latestProcessingLatencyUs;
    latestSourceToGrpcLatencyUs =
      metadata?.source_to_grpc_latency_us ?? latestSourceToGrpcLatencyUs;

    if (name === "PumpFunCreate" || name === "PumpFunCreateV2") {
      const mint = stringField(data, "mint");
      const creator = stringField(data, "creator");
      if (mint && creator) {
        if (rememberDeveloper(mint, creator)) scheduleFilterUpdate();
        console.log(`CREATE mint=${mint} creator=${creator} slot=${slot}`);
      }
      continue;
    }

    if (name === "PumpSwapCreatePool") {
      const mint = trackedMintForPumpSwap(data);
      const pool = stringField(data, "pool");
      if (mint && pool) {
        if (rememberPool(mint, pool)) scheduleFilterUpdate();
        const creator = stringField(data, "creator");
        if (creator && creator === devByMint.get(mint)) {
          devPoolCreateCount++;
          console.log(`DEV POOL CREATE mint=${mint} pool=${pool} creator=${creator} slot=${slot}`);
        } else {
          console.log(`PUMPSWAP POOL mint=${mint} pool=${pool} creator=${creator} slot=${slot}`);
        }
      }
      continue;
    }

    if (name === "PumpFunMigrate") {
      const mint = stringField(data, "mint");
      const pool = stringField(data, "pool");
      if (mint && pool && devByMint.has(mint)) {
        if (rememberPool(mint, pool)) scheduleFilterUpdate();
        console.log(`PUMPFUN MIGRATE mint=${mint} pool=${pool} slot=${slot}`);
      }
      continue;
    }

    if (name === "PumpSwapLiquidityAdded") {
      const pool = stringField(data, "pool");
      const user = stringField(data, "user");
      const mint = mintByPool.get(pool) ?? "";
      if (mint && user === devByMint.get(mint)) {
        devLiquidityAddCount++;
        console.log(
          `DEV LIQUIDITY ADD mint=${mint} pool=${pool} user=${user} ` +
            `base=${String(data.base_amount_in ?? 0)} quote=${String(data.quote_amount_in ?? 0)} ` +
            `signature=${metadata?.signature ?? ""} slot=${slot}`
        );
      }
      continue;
    }

    if (
      name === "PumpFunBuy" ||
      name === "PumpFunSell" ||
      name === "PumpSwapBuy" ||
      name === "PumpSwapSell"
    ) {
      const mint = name.startsWith("PumpSwap")
        ? trackedMintForPumpSwap(data)
        : stringField(data, "mint");
      const user = stringField(data, "user");
      if (name.startsWith("PumpSwap")) {
        const pool = stringField(data, "pool");
        if (mint && pool && rememberPool(mint, pool)) scheduleFilterUpdate();
      }
      if (mint && user === devByMint.get(mint)) {
        devTradeCount++;
        console.log(
          `DEV TRADE type=${name} mint=${mint} user=${user} ` +
            `quote_mint=${stringField(data, "quote_mint")} ` +
            `signature=${metadata?.signature ?? ""} slot=${slot}`
        );
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
