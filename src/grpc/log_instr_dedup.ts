import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";

type EventName = keyof DexEvent & string;
type EventPayload = Record<string, any>;

const ZERO = defaultPubkey();

const PUMPFUN_TRADE_NAMES = new Set([
  "PumpFunTrade",
  "PumpFunBuy",
  "PumpFunSell",
  "PumpFunBuyExactSolIn",
]);

function eventName(ev: DexEvent): string {
  return Object.keys(ev)[0] ?? "";
}

function payload(ev: DexEvent): EventPayload | null {
  const key = eventName(ev) as EventName;
  return key ? ((ev as any)[key] as EventPayload) : null;
}

function isDefaultPubkey(v: unknown): boolean {
  return v === "" || v === ZERO || v == null;
}

function fillString(to: EventPayload, key: string, from: EventPayload): void {
  const value = from[key];
  if (isDefaultPubkey(to[key]) && !isDefaultPubkey(value)) {
    to[key] = value;
  }
}

function fillNonZero(to: EventPayload, key: string, from: EventPayload): void {
  const value = from[key];
  if ((to[key] == null || to[key] === 0n || to[key] === 0) && value != null && value !== 0n && value !== 0) {
    to[key] = value;
  }
}

function fillNestedString(
  to: EventPayload,
  parent: string,
  key: string,
  from: EventPayload
): void {
  const srcParent = from[parent];
  if (!srcParent || typeof srcParent !== "object") return;
  if (!to[parent] || typeof to[parent] !== "object") to[parent] = {};
  fillString(to[parent], key, srcParent);
}

function fillIxName(to: EventPayload, from: EventPayload): void {
  if ((to.ix_name ?? "") === "" && (from.ix_name ?? "") !== "") {
    to.ix_name = from.ix_name;
  }
}

function ixLane(ixName: unknown): number {
  switch (ixName) {
    case "sell":
    case "sell_v2":
      return 1;
    case "buy_exact_sol_in":
    case "buy_exact_quote_in":
    case "buy_exact_quote_in_v2":
      return 2;
    default:
      return 0;
  }
}

function nextOccurrence(base: string, counts: Map<string, number>): number {
  const current = counts.get(base) ?? 0;
  counts.set(base, current + 1);
  return current;
}

function dedupeKey(ev: DexEvent, pumpfunLaneCounts: Map<string, number>): string | null {
  const name = eventName(ev);
  const data = payload(ev);
  if (!data) return null;

  if (PUMPFUN_TRADE_NAMES.has(name)) {
    const lane = ixLane(data.ix_name);
    const base = `${data.mint}|${data.user}|${Boolean(data.is_buy)}|${lane}`;
    const occurrence = nextOccurrence(base, pumpfunLaneCounts);
    return `PumpFunTrade|${base}|${occurrence}`;
  }

  switch (name) {
    case "PumpFunCreate":
      return `PumpFunCreate|${data.mint}`;
    case "PumpFunCreateV2":
      return `PumpFunCreate|${data.mint}`;
    case "PumpFunMigrate":
      return `PumpFunMigrate|${data.mint}|${data.pool}|${data.user}`;
    case "RaydiumLaunchlabTrade":
      return `RaydiumLaunchlabTrade|${data.pool_state}|${data.user}|${Boolean(data.is_buy)}`;
    case "RaydiumLaunchlabPoolCreate":
      return `RaydiumLaunchlabPoolCreate|${data.pool_state}`;
    case "RaydiumLaunchlabMigrateAmm":
      return `RaydiumLaunchlabMigrateAmm|${data.old_pool}|${data.new_pool}|${data.user}`;
    case "PumpSwapTrade":
      return `PumpSwapTrade|${data.mint}|${data.user}|${Boolean(data.is_buy)}|${ixLane(data.ix_name)}`;
    case "PumpSwapBuy":
      return `PumpSwapBuy|${data.pool}|${data.user}`;
    case "PumpSwapSell":
      return `PumpSwapSell|${data.pool}|${data.user}`;
    case "PumpSwapCreatePool":
      return `PumpSwapCreatePool|${data.pool}|${data.base_mint}|${data.quote_mint}`;
    case "PumpSwapLiquidityAdded":
      return `PumpSwapLiquidityAdded|${data.pool}|${data.user}`;
    case "PumpSwapLiquidityRemoved":
      return `PumpSwapLiquidityRemoved|${data.pool}|${data.user}`;
    case "RaydiumClmmSwap":
      return `RaydiumClmmSwap|${data.pool_state}|${Boolean(data.zero_for_one)}`;
    case "RaydiumAmmV4Swap":
      return `RaydiumAmmV4Swap|${data.amm}`;
    case "MeteoraDlmmSwap":
      return `MeteoraDlmmSwap|${data.pool}|${data.from}|${Boolean(data.swap_for_y)}`;
    default:
      return null;
  }
}

function mergePumpfunTrade(log: EventPayload, ix: EventPayload): void {
  for (const key of [
    "bonding_curve",
    "bonding_curve_v2",
    "associated_bonding_curve",
    "associated_user",
    "system_program",
    "token_program",
    "quote_token_program",
    "associated_token_program",
    "creator_vault",
    "fee_recipient",
    "associated_quote_fee_recipient",
    "buyback_fee_recipient",
    "associated_quote_buyback_fee_recipient",
    "associated_quote_bonding_curve",
    "associated_quote_user",
    "associated_creator_vault",
    "sharing_config",
    "event_authority",
    "program",
    "global_volume_accumulator",
    "user_volume_accumulator",
    "associated_user_volume_accumulator",
    "fee_config",
    "fee_program",
    "global",
    "quote_mint",
    "creator",
  ]) {
    fillString(log, key, ix);
  }
  if (log.account == null && ix.account != null) log.account = ix.account;
  for (const key of [
    "amount",
    "max_sol_cost",
    "min_sol_output",
    "spendable_sol_in",
    "spendable_quote_in",
    "min_tokens_out",
    "quote_amount",
    "virtual_quote_reserves",
    "real_quote_reserves",
  ]) {
    fillNonZero(log, key, ix);
  }
  fillIxName(log, ix);
  log.is_created_buy = Boolean(log.is_created_buy) || Boolean(ix.is_created_buy);
}

function mergePumpfunCreate(log: EventPayload, ix: EventPayload): void {
  for (const key of [
    "name",
    "symbol",
    "uri",
    "mint",
    "bonding_curve",
    "user",
    "creator",
    "token_program",
    "quote_mint",
    "quote_vault",
    "quote_token_program",
  ]) {
    fillString(log, key, ix);
  }
  for (const key of [
    "timestamp",
    "virtual_token_reserves",
    "virtual_sol_reserves",
    "real_token_reserves",
    "token_total_supply",
    "virtual_quote_reserves",
  ]) {
    fillNonZero(log, key, ix);
  }
  fillIxName(log, ix);
  log.is_mayhem_mode = Boolean(log.is_mayhem_mode) || Boolean(ix.is_mayhem_mode);
  log.is_cashback_enabled =
    Boolean(log.is_cashback_enabled) || Boolean(ix.is_cashback_enabled);
}

function mergePumpfunCreateV2(log: EventPayload, ix: EventPayload): void {
  mergePumpfunCreate(log, ix);
  for (const key of [
    "mint_authority",
    "associated_bonding_curve",
    "global",
    "system_program",
    "associated_token_program",
    "mayhem_program_id",
    "global_params",
    "sol_vault",
    "mayhem_state",
    "mayhem_token_vault",
    "event_authority",
    "program",
    "observed_fee_recipient",
  ]) {
    fillString(log, key, ix);
  }
}

function mergePumpfunMigrate(log: EventPayload, ix: EventPayload): void {
  for (const key of ["bonding_curve", "pool", "user"]) {
    fillString(log, key, ix);
  }
}

function mergePumpSwapBuySell(log: EventPayload, ix: EventPayload, includeIxName: boolean): void {
  for (const key of [
    "user_base_token_account",
    "user_quote_token_account",
    "protocol_fee_recipient",
    "protocol_fee_recipient_token_account",
    "coin_creator",
    "base_mint",
    "quote_mint",
    "pool_base_token_account",
    "pool_quote_token_account",
    "coin_creator_vault_ata",
    "coin_creator_vault_authority",
    "base_token_program",
    "quote_token_program",
    "pool_v2",
    "fee_recipient",
    "fee_recipient_quote_token_account",
  ]) {
    fillString(log, key, ix);
  }
  if (includeIxName) fillIxName(log, ix);
}

function mergePumpSwapCreatePool(log: EventPayload, ix: EventPayload): void {
  for (const key of [
    "creator",
    "pool",
    "lp_mint",
    "user_base_token_account",
    "user_quote_token_account",
    "coin_creator",
  ]) {
    fillString(log, key, ix);
  }
}

function mergePumpSwapLiquidity(log: EventPayload, ix: EventPayload): void {
  for (const key of [
    "user_base_token_account",
    "user_quote_token_account",
    "user_pool_token_account",
  ]) {
    fillString(log, key, ix);
  }
}

function mergeRaydiumClmmSwap(log: EventPayload, ix: EventPayload): void {
  for (const key of ["token_account_0", "token_account_1", "sender"]) {
    fillString(log, key, ix);
  }
}

function mergeRaydiumAmmV4Swap(log: EventPayload, ix: EventPayload): void {
  for (const key of [
    "token_program",
    "amm_authority",
    "amm_open_orders",
    "amm_target_orders",
    "pool_coin_token_account",
    "pool_pc_token_account",
    "serum_program",
    "serum_market",
    "serum_bids",
    "serum_asks",
    "serum_event_queue",
    "serum_coin_vault_account",
    "serum_pc_vault_account",
    "serum_vault_signer",
    "user_source_token_account",
    "user_destination_token_account",
  ]) {
    fillString(log, key, ix);
  }
}

function mergeRaydiumLaunchlabPoolCreate(log: EventPayload, ix: EventPayload): void {
  fillString(log, "creator", ix);
  for (const key of ["name", "symbol", "uri"]) {
    fillNestedString(log, "base_mint_param", key, ix);
  }
}

function mergeRaydiumLaunchlabMigrateAmm(log: EventPayload, ix: EventPayload): void {
  for (const key of ["old_pool", "new_pool", "user"]) {
    fillString(log, key, ix);
  }
}

function mergeGrpcInstructionIntoLog(logEvent: DexEvent, ixEvent: DexEvent): void {
  const logName = eventName(logEvent);
  const ixName = eventName(ixEvent);
  const log = payload(logEvent);
  const ix = payload(ixEvent);
  if (!log || !ix) return;

  if (PUMPFUN_TRADE_NAMES.has(logName) && PUMPFUN_TRADE_NAMES.has(ixName)) {
    mergePumpfunTrade(log, ix);
    return;
  }

  if (logName === "PumpFunCreate" && ixName === "PumpFunCreateV2") {
    mergePumpfunCreate(log, ix);
    return;
  }
  if (logName === "PumpFunCreateV2" && ixName === "PumpFunCreate") {
    mergePumpfunCreateV2(log, ix);
    return;
  }

  switch (logName) {
    case "PumpFunCreate":
      if (ixName === "PumpFunCreate") mergePumpfunCreate(log, ix);
      break;
    case "PumpFunCreateV2":
      if (ixName === "PumpFunCreateV2") mergePumpfunCreateV2(log, ix);
      break;
    case "PumpFunMigrate":
      if (ixName === "PumpFunMigrate") mergePumpfunMigrate(log, ix);
      break;
    case "PumpSwapTrade":
      if (ixName === "PumpSwapTrade") fillIxName(log, ix);
      break;
    case "PumpSwapBuy":
      if (ixName === "PumpSwapBuy") mergePumpSwapBuySell(log, ix, true);
      break;
    case "PumpSwapSell":
      if (ixName === "PumpSwapSell") mergePumpSwapBuySell(log, ix, false);
      break;
    case "PumpSwapCreatePool":
      if (ixName === "PumpSwapCreatePool") mergePumpSwapCreatePool(log, ix);
      break;
    case "PumpSwapLiquidityAdded":
      if (ixName === "PumpSwapLiquidityAdded") mergePumpSwapLiquidity(log, ix);
      break;
    case "PumpSwapLiquidityRemoved":
      if (ixName === "PumpSwapLiquidityRemoved") mergePumpSwapLiquidity(log, ix);
      break;
    case "RaydiumClmmSwap":
      if (ixName === "RaydiumClmmSwap") mergeRaydiumClmmSwap(log, ix);
      break;
    case "RaydiumAmmV4Swap":
      if (ixName === "RaydiumAmmV4Swap") mergeRaydiumAmmV4Swap(log, ix);
      break;
    case "RaydiumLaunchlabPoolCreate":
      if (ixName === "RaydiumLaunchlabPoolCreate") mergeRaydiumLaunchlabPoolCreate(log, ix);
      break;
    case "RaydiumLaunchlabMigrateAmm":
      if (ixName === "RaydiumLaunchlabMigrateAmm") mergeRaydiumLaunchlabMigrateAmm(log, ix);
      break;
    default:
      break;
  }
}

export function dedupeLogInstructionEvents(
  logEvents: DexEvent[],
  instructionEvents: DexEvent[]
): DexEvent[] {
  const out: DexEvent[] = [];
  const indexByKey = new Map<string, number>();
  const logPumpfunLaneCounts = new Map<string, number>();
  const ixPumpfunLaneCounts = new Map<string, number>();

  for (const ev of logEvents) {
    const key = dedupeKey(ev, logPumpfunLaneCounts);
    if (key) indexByKey.set(key, out.length);
    out.push(ev);
  }

  for (const ev of instructionEvents) {
    const key = dedupeKey(ev, ixPumpfunLaneCounts);
    if (!key) {
      out.push(ev);
      continue;
    }
    const existing = indexByKey.get(key);
    if (existing === undefined) {
      indexByKey.set(key, out.length);
      out.push(ev);
      continue;
    }
    mergeGrpcInstructionIntoLog(out[existing], ev);
  }

  return out;
}
