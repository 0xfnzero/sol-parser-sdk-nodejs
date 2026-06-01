import { makeMetadata, type EventMetadata } from "../core/metadata.js";
import type { DexEvent } from "../core/dex_event.js";
import { decodeProgramDataLine } from "./program_data.js";
import { nowUs } from "../core/clock.js";
import {
  parseCreateFromData,
  parseMigrateBondingCurveCreatorFromData,
  parseMigrateFromData,
  parseTradeFromData,
} from "./pump.js";
import {
  parseAddLiquidityFromData,
  parseBuyFromData,
  parseCreatePoolFromData,
  parseRemoveLiquidityFromData,
  parseSellFromData,
} from "./pump_amm.js";
import {
  parseCreateFeeSharingConfigFromData,
  parseInitializeFeeConfigFromData,
  parseResetFeeSharingConfigFromData,
  parseRevokeFeeSharingAuthorityFromData,
  parseTransferFeeSharingAuthorityFromData,
  parseUpdateAdminFromData,
  parseUpdateFeeConfigFromData,
  parseUpdateFeeSharesFromData,
  parseUpsertFeeTiersFromData,
} from "./pump_fees.js";
import {
  parseCollectFeeFromData,
  parseCreatePoolFromData as parseClmmCreatePool,
  parseDecreaseLiquidityFromData,
  parseIncreaseLiquidityFromData,
  parseSwapFromData as parseClmmSwap,
} from "./raydium_clmm.js";
import {
  parseDepositFromData as parseCpmmDeposit,
  parseSwapBaseInFromData as parseCpmmSwapIn,
  parseSwapBaseOutFromData as parseCpmmSwapOut,
  parseWithdrawFromData as parseCpmmWithdraw,
} from "./raydium_cpmm.js";
import bs58 from "bs58";
import {
  parseDepositFromData as parseAmmDeposit,
  parseInitialize2FromData,
  parseSwapBaseInFromData as parseAmmSwapIn,
  parseSwapBaseOutFromData as parseAmmSwapOut,
  parseWithdrawFromData as parseAmmWithdraw,
  parseWithdrawPnlFromData as parseAmmWithdrawPnl,
} from "./raydium_amm.js";
import {
  parseLiquidityDecreasedFromData,
  parseLiquidityIncreasedFromData,
  parsePoolInitializedFromData,
  parseTradedFromData,
} from "./orca.js";
import {
  parseAddLiquidityFromData as parseMeteoraPoolsAdd,
  parseBootstrapLiquidityFromData,
  parsePoolCreatedFromData,
  parseRemoveLiquidityFromData as parseMeteoraPoolsRemove,
  parseSetPoolFeesFromData,
  parseSwapFromData as parseMeteoraPoolsSwap,
} from "./meteora_amm.js";
import { parseMeteoraDammLog } from "./meteora_damm.js";
import { parseMeteoraDbcFromDiscriminator, METEORA_DBC_DISC } from "./meteora_dbc.js";
import { parseDlmmFromDecoded } from "./meteora_dlmm.js";
import {
  parseRaydiumLaunchlabFromDiscriminator,
  RAYDIUM_LAUNCHLAB_DISC,
} from "./raydium_launchlab.js";
import type { EventType, EventTypeFilter } from "../grpc/types.js";
import { readDiscriminatorU64 } from "../util/binary.js";
import { PROGRAM_LOG_DISC as DISC } from "./program_log_discriminators.js";
import {
  METEORA_DAMM_V2_PROGRAM_ID,
  METEORA_DBC_PROGRAM_ID,
  METEORA_DLMM_PROGRAM_ID,
  RAYDIUM_LAUNCHLAB_PROGRAM_ID,
} from "../grpc/program_ids.js";

function discriminatorToEventType(disc: bigint): EventType | null {
  if (disc === DISC.PUMPFUN_CREATE) return "PumpFunCreate";
  if (disc === DISC.PUMPFUN_TRADE) return "PumpFunTrade";
  if (disc === DISC.PUMPFUN_MIGRATE) return "PumpFunMigrate";
  if (disc === DISC.PUMPFUN_MIGRATE_BONDING_CURVE_CREATOR) return "PumpFunMigrateBondingCurveCreator";
  if (disc === DISC.PUMP_FEES_CREATE_FEE_SHARING_CONFIG) return "PumpFeesCreateFeeSharingConfig";
  if (disc === DISC.PUMP_FEES_INITIALIZE_FEE_CONFIG) return "PumpFeesInitializeFeeConfig";
  if (disc === DISC.PUMP_FEES_RESET_FEE_SHARING_CONFIG) return "PumpFeesResetFeeSharingConfig";
  if (disc === DISC.PUMP_FEES_REVOKE_FEE_SHARING_AUTHORITY) return "PumpFeesRevokeFeeSharingAuthority";
  if (disc === DISC.PUMP_FEES_TRANSFER_FEE_SHARING_AUTHORITY) return "PumpFeesTransferFeeSharingAuthority";
  if (disc === DISC.PUMP_FEES_UPDATE_ADMIN) return "PumpFeesUpdateAdmin";
  if (disc === DISC.PUMP_FEES_UPDATE_FEE_CONFIG) return "PumpFeesUpdateFeeConfig";
  if (disc === DISC.PUMP_FEES_UPDATE_FEE_SHARES) return "PumpFeesUpdateFeeShares";
  if (disc === DISC.PUMP_FEES_UPSERT_FEE_TIERS) return "PumpFeesUpsertFeeTiers";
  if (disc === DISC.PUMPSWAP_BUY) return "PumpSwapBuy";
  if (disc === DISC.PUMPSWAP_SELL) return "PumpSwapSell";
  if (disc === DISC.PUMPSWAP_CREATE_POOL) return "PumpSwapCreatePool";
  if (disc === DISC.PUMPSWAP_ADD_LIQUIDITY) return "PumpSwapLiquidityAdded";
  if (disc === DISC.PUMPSWAP_REMOVE_LIQUIDITY) return "PumpSwapLiquidityRemoved";
  if (disc === DISC.RAYDIUM_CLMM_SWAP) return "RaydiumClmmSwap";
  if (disc === DISC.RAYDIUM_CLMM_INCREASE_LIQUIDITY) return "RaydiumClmmIncreaseLiquidity";
  if (disc === DISC.RAYDIUM_CLMM_DECREASE_LIQUIDITY) return "RaydiumClmmDecreaseLiquidity";
  if (disc === DISC.RAYDIUM_CLMM_CREATE_POOL) return "RaydiumClmmCreatePool";
  if (disc === DISC.RAYDIUM_CLMM_COLLECT_FEE) return "RaydiumClmmCollectFee";
  if (disc === DISC.RAYDIUM_CPMM_SWAP_BASE_IN) return "RaydiumCpmmSwap";
  if (disc === DISC.RAYDIUM_CPMM_SWAP_BASE_OUT) return "RaydiumCpmmSwap";
  if (disc === DISC.RAYDIUM_CPMM_DEPOSIT) return "RaydiumCpmmDeposit";
  if (disc === DISC.RAYDIUM_CPMM_WITHDRAW) return "RaydiumCpmmWithdraw";
  if (disc === DISC.RAYDIUM_AMM_SWAP_BASE_IN) return "RaydiumAmmV4Swap";
  if (disc === DISC.RAYDIUM_AMM_SWAP_BASE_OUT) return "RaydiumAmmV4Swap";
  if (disc === DISC.RAYDIUM_AMM_DEPOSIT) return "RaydiumAmmV4Deposit";
  if (disc === DISC.RAYDIUM_AMM_WITHDRAW) return "RaydiumAmmV4Withdraw";
  if (disc === DISC.RAYDIUM_AMM_WITHDRAW_PNL) return "RaydiumAmmV4WithdrawPnl";
  if (disc === DISC.RAYDIUM_AMM_INITIALIZE2) return "RaydiumAmmV4Initialize2";
  if (disc === DISC.ORCA_TRADED) return "OrcaWhirlpoolSwap";
  if (disc === DISC.ORCA_LIQUIDITY_INCREASED) return "OrcaWhirlpoolLiquidityIncreased";
  if (disc === DISC.ORCA_LIQUIDITY_DECREASED) return "OrcaWhirlpoolLiquidityDecreased";
  if (disc === DISC.ORCA_POOL_INITIALIZED) return "OrcaWhirlpoolPoolInitialized";
  if (disc === DISC.METEORA_AMM_SWAP) return "MeteoraPoolsSwap";
  if (disc === DISC.METEORA_AMM_ADD_LIQUIDITY) return "MeteoraPoolsAddLiquidity";
  if (disc === DISC.METEORA_AMM_REMOVE_LIQUIDITY) return "MeteoraPoolsRemoveLiquidity";
  if (disc === DISC.METEORA_AMM_BOOTSTRAP_LIQUIDITY) return "MeteoraPoolsBootstrapLiquidity";
  if (disc === DISC.METEORA_AMM_POOL_CREATED) return "MeteoraPoolsPoolCreated";
  if (disc === DISC.METEORA_AMM_SET_POOL_FEES) return "MeteoraPoolsSetPoolFees";
  if (disc === DISC.METEORA_DAMM_SWAP) return "MeteoraDammV2Swap";
  if (disc === DISC.METEORA_DAMM_SWAP2) return "MeteoraDammV2Swap";
  if (disc === DISC.METEORA_DAMM_ADD_LIQUIDITY) return "MeteoraDammV2AddLiquidity";
  if (disc === DISC.METEORA_DAMM_REMOVE_LIQUIDITY) return "MeteoraDammV2RemoveLiquidity";
  if (disc === DISC.METEORA_DAMM_INITIALIZE_POOL) return "MeteoraDammV2InitializePool";
  if (disc === DISC.METEORA_DAMM_CREATE_POSITION) return "MeteoraDammV2CreatePosition";
  if (disc === DISC.METEORA_DAMM_CLOSE_POSITION) return "MeteoraDammV2ClosePosition";
  return null;
}

function programScopedDiscriminatorToEventType(programId: string | undefined, disc: bigint): EventType | null {
  if (programId === RAYDIUM_LAUNCHLAB_PROGRAM_ID) {
    if (disc === RAYDIUM_LAUNCHLAB_DISC.TRADE) return "RaydiumLaunchlabTrade";
    if (disc === RAYDIUM_LAUNCHLAB_DISC.POOL_CREATE) return "RaydiumLaunchlabPoolCreate";
    return null;
  }
  if (programId === METEORA_DAMM_V2_PROGRAM_ID) {
    if (disc === DISC.METEORA_DAMM_SWAP || disc === DISC.METEORA_DAMM_SWAP2) return "MeteoraDammV2Swap";
    if (disc === DISC.METEORA_DAMM_ADD_LIQUIDITY) return "MeteoraDammV2AddLiquidity";
    if (disc === DISC.METEORA_DAMM_REMOVE_LIQUIDITY) return "MeteoraDammV2RemoveLiquidity";
    if (disc === DISC.METEORA_DAMM_INITIALIZE_POOL) return "MeteoraDammV2InitializePool";
    if (disc === DISC.METEORA_DAMM_CREATE_POSITION) return "MeteoraDammV2CreatePosition";
    if (disc === DISC.METEORA_DAMM_CLOSE_POSITION) return "MeteoraDammV2ClosePosition";
    return null;
  }
  if (programId === METEORA_DBC_PROGRAM_ID) {
    if (disc === METEORA_DBC_DISC.SWAP) return "MeteoraDbcSwap";
    if (disc === METEORA_DBC_DISC.INITIALIZE_POOL) return "MeteoraDbcInitializePool";
    if (disc === METEORA_DBC_DISC.CURVE_COMPLETE) return "MeteoraDbcCurveComplete";
    return null;
  }
  return discriminatorToEventType(disc);
}

function filterAllowsUnknownSupported(filter: EventTypeFilter | undefined): boolean {
  return !filter?.include_only;
}

function filterIncludesAny(filter: EventTypeFilter, types: readonly EventType[]): boolean {
  if (filter.include_only) {
    return filter.include_only.some((t) => types.includes(t));
  }
  return types.some((t) => filter.shouldInclude(t));
}

function filterIncludesProgram(programId: string | undefined, filter: EventTypeFilter): boolean {
  if (programId === RAYDIUM_LAUNCHLAB_PROGRAM_ID) {
    return filterIncludesAny(filter, [
      "RaydiumLaunchlabTrade",
      "RaydiumLaunchlabPoolCreate",
      "RaydiumLaunchlabMigrateAmm",
    ]);
  }
  if (programId === METEORA_DAMM_V2_PROGRAM_ID) {
    return filterIncludesAny(filter, [
      "MeteoraDammV2Swap",
      "MeteoraDammV2AddLiquidity",
      "MeteoraDammV2RemoveLiquidity",
      "MeteoraDammV2InitializePool",
      "MeteoraDammV2CreatePosition",
      "MeteoraDammV2ClosePosition",
    ]);
  }
  if (programId === METEORA_DBC_PROGRAM_ID) {
    return filterIncludesAny(filter, [
      "MeteoraDbcSwap",
      "MeteoraDbcInitializePool",
      "MeteoraDbcCurveComplete",
    ]);
  }
  if (programId === METEORA_DLMM_PROGRAM_ID) {
    return filterIncludesAny(filter, [
      "MeteoraDlmmSwap",
      "MeteoraDlmmAddLiquidity",
      "MeteoraDlmmRemoveLiquidity",
      "MeteoraDlmmInitializePool",
      "MeteoraDlmmInitializeBinArray",
      "MeteoraDlmmCreatePosition",
      "MeteoraDlmmClosePosition",
      "MeteoraDlmmClaimFee",
    ]);
  }
  return filterAllowsUnknownSupported(filter);
}

function pumpfunTradeMatchesFilter(ev: DexEvent, includeOnly: EventType[]): boolean {
  if ("PumpFunBuy" in ev) return includeOnly.includes("PumpFunBuy");
  if ("PumpFunSell" in ev) return includeOnly.includes("PumpFunSell");
  if ("PumpFunBuyExactSolIn" in ev) return includeOnly.includes("PumpFunBuyExactSolIn");
  if ("PumpFunTrade" in ev) return includeOnly.includes("PumpFunTrade");
  if ("PumpFunCreate" in ev) return includeOnly.includes("PumpFunCreate");
  if ("PumpFunCreateV2" in ev) return includeOnly.includes("PumpFunCreateV2");
  return false;
}

function eventTypeFromDexEvent(ev: DexEvent): EventType | null {
  const key = Object.keys(ev)[0];
  return key ? (key as EventType) : null;
}

function applyActualEventTypeFilter(ev: DexEvent | null, filter: EventTypeFilter | undefined): DexEvent | null {
  if (!ev || !filter) return ev;
  const actual = eventTypeFromDexEvent(ev);
  if (actual && !filter.shouldInclude(actual)) return null;
  return ev;
}

function applyPumpfunSecondaryFilter(ev: DexEvent | null, filter: EventTypeFilter | undefined): DexEvent | null {
  if (!ev || !filter) return ev;
  if (filter.include_only?.length) {
    const hasSpecific = filter.include_only.some((t) =>
      ["PumpFunBuy", "PumpFunSell", "PumpFunBuyExactSolIn", "PumpFunCreate", "PumpFunCreateV2"].includes(t)
    );
    if (hasSpecific && !pumpfunTradeMatchesFilter(ev, filter.include_only)) return null;
  }
  return applyActualEventTypeFilter(ev, filter);
}

export function parseLogOptimized(
  log: string,
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number,
  eventTypeFilter: EventTypeFilter | undefined,
  isCreatedBuy: boolean,
  recentBlockhash?: Uint8Array,
  programId?: string
): DexEvent | null {
  const buf = decodeProgramDataLine(log);
  if (!buf) return null;
  const disc = readDiscriminatorU64(buf);
  if (disc === null) return null;
  const data = buf.subarray(8);
  const rb =
    recentBlockhash && recentBlockhash.length > 0 ? bs58.encode(recentBlockhash) : undefined;
  const metadata: EventMetadata = makeMetadata(signature, slot, txIndex, blockTimeUs, grpcRecvUs, rb);

  const et = programScopedDiscriminatorToEventType(programId, disc);
  if (eventTypeFilter && et !== null) {
    if (!eventTypeFilter.shouldInclude(et)) return null;
  } else if (eventTypeFilter && et === null) {
    if (programId) {
      if (!filterIncludesProgram(programId, eventTypeFilter)) return null;
    } else if (!filterAllowsUnknownSupported(eventTypeFilter)) return null;
  }

  if (programId === RAYDIUM_LAUNCHLAB_PROGRAM_ID) {
    const ev = parseRaydiumLaunchlabFromDiscriminator(disc, data, metadata);
    return applyActualEventTypeFilter(ev, eventTypeFilter);
  }
  if (programId === METEORA_DBC_PROGRAM_ID) {
    const ev = parseMeteoraDbcFromDiscriminator(disc, data, metadata);
    return applyActualEventTypeFilter(ev, eventTypeFilter);
  }
  if (programId === METEORA_DLMM_PROGRAM_ID) {
    const ev = parseDlmmFromDecoded(buf, metadata);
    return applyActualEventTypeFilter(ev, eventTypeFilter);
  }

  if (disc === DISC.PUMPFUN_TRADE) {
    const ev = parseTradeFromData(data, metadata, isCreatedBuy);
    return applyPumpfunSecondaryFilter(ev, eventTypeFilter);
  }
  if (disc === DISC.RAYDIUM_CLMM_SWAP) return parseClmmSwap(data, metadata);
  if (disc === DISC.RAYDIUM_AMM_SWAP_BASE_IN) return parseAmmSwapIn(data, metadata);
  if (disc === DISC.PUMPSWAP_BUY) return parseBuyFromData(data, metadata);
  if (disc === DISC.PUMPSWAP_SELL) return parseSellFromData(data, metadata);

  switch (disc) {
    case DISC.PUMPFUN_CREATE:
      return parseCreateFromData(data, metadata);
    case DISC.PUMPFUN_MIGRATE:
      return parseMigrateFromData(data, metadata);
    case DISC.PUMPFUN_MIGRATE_BONDING_CURVE_CREATOR:
      return parseMigrateBondingCurveCreatorFromData(data, metadata);
    case DISC.PUMP_FEES_CREATE_FEE_SHARING_CONFIG:
      return parseCreateFeeSharingConfigFromData(data, metadata);
    case DISC.PUMP_FEES_INITIALIZE_FEE_CONFIG:
      return parseInitializeFeeConfigFromData(data, metadata);
    case DISC.PUMP_FEES_RESET_FEE_SHARING_CONFIG:
      return parseResetFeeSharingConfigFromData(data, metadata);
    case DISC.PUMP_FEES_REVOKE_FEE_SHARING_AUTHORITY:
      return parseRevokeFeeSharingAuthorityFromData(data, metadata);
    case DISC.PUMP_FEES_TRANSFER_FEE_SHARING_AUTHORITY:
      return parseTransferFeeSharingAuthorityFromData(data, metadata);
    case DISC.PUMP_FEES_UPDATE_ADMIN:
      return parseUpdateAdminFromData(data, metadata);
    case DISC.PUMP_FEES_UPDATE_FEE_CONFIG:
      return parseUpdateFeeConfigFromData(data, metadata);
    case DISC.PUMP_FEES_UPDATE_FEE_SHARES:
      return parseUpdateFeeSharesFromData(data, metadata);
    case DISC.PUMP_FEES_UPSERT_FEE_TIERS:
      return parseUpsertFeeTiersFromData(data, metadata);
    case DISC.PUMPSWAP_CREATE_POOL:
      return parseCreatePoolFromData(data, metadata);
    case DISC.PUMPSWAP_ADD_LIQUIDITY:
      return parseAddLiquidityFromData(data, metadata);
    case DISC.PUMPSWAP_REMOVE_LIQUIDITY:
      return parseRemoveLiquidityFromData(data, metadata);
    case DISC.RAYDIUM_CLMM_INCREASE_LIQUIDITY:
      return parseIncreaseLiquidityFromData(data, metadata);
    case DISC.RAYDIUM_CLMM_DECREASE_LIQUIDITY:
      return parseDecreaseLiquidityFromData(data, metadata);
    case DISC.RAYDIUM_CLMM_CREATE_POOL:
      return parseClmmCreatePool(data, metadata);
    case DISC.RAYDIUM_CLMM_COLLECT_FEE:
      return parseCollectFeeFromData(data, metadata);
    case DISC.RAYDIUM_CPMM_SWAP_BASE_IN:
      return parseCpmmSwapIn(data, metadata);
    case DISC.RAYDIUM_CPMM_SWAP_BASE_OUT:
      return parseCpmmSwapOut(data, metadata);
    case DISC.RAYDIUM_CPMM_DEPOSIT:
      return parseCpmmDeposit(data, metadata);
    case DISC.RAYDIUM_CPMM_WITHDRAW:
      return parseCpmmWithdraw(data, metadata);
    case DISC.RAYDIUM_AMM_SWAP_BASE_OUT:
      return parseAmmSwapOut(data, metadata);
    case DISC.RAYDIUM_AMM_DEPOSIT:
      return parseAmmDeposit(data, metadata);
    case DISC.RAYDIUM_AMM_WITHDRAW:
      return parseAmmWithdraw(data, metadata);
    case DISC.RAYDIUM_AMM_INITIALIZE2:
      return parseInitialize2FromData(data, metadata);
    case DISC.RAYDIUM_AMM_WITHDRAW_PNL:
      return parseAmmWithdrawPnl(data, metadata);
    case DISC.ORCA_TRADED:
      return parseTradedFromData(data, metadata);
    case DISC.ORCA_LIQUIDITY_INCREASED:
      return parseLiquidityIncreasedFromData(data, metadata);
    case DISC.ORCA_LIQUIDITY_DECREASED:
      return parseLiquidityDecreasedFromData(data, metadata);
    case DISC.ORCA_POOL_INITIALIZED:
      return parsePoolInitializedFromData(data, metadata);
    case DISC.METEORA_AMM_SWAP:
      return parseMeteoraPoolsSwap(data, metadata);
    case DISC.METEORA_AMM_ADD_LIQUIDITY:
      return parseMeteoraPoolsAdd(data, metadata);
    case DISC.METEORA_AMM_REMOVE_LIQUIDITY:
      return parseMeteoraPoolsRemove(data, metadata);
    case DISC.METEORA_AMM_BOOTSTRAP_LIQUIDITY:
      return parseBootstrapLiquidityFromData(data, metadata);
    case DISC.METEORA_AMM_POOL_CREATED:
      return parsePoolCreatedFromData(data, metadata);
    case DISC.METEORA_AMM_SET_POOL_FEES:
      return parseSetPoolFeesFromData(data, metadata);
    case DISC.METEORA_DAMM_SWAP:
    case DISC.METEORA_DAMM_SWAP2:
    case DISC.METEORA_DAMM_ADD_LIQUIDITY:
    case DISC.METEORA_DAMM_REMOVE_LIQUIDITY:
    case DISC.METEORA_DAMM_INITIALIZE_POOL:
    case DISC.METEORA_DAMM_CREATE_POSITION:
    case DISC.METEORA_DAMM_CLOSE_POSITION:
      return parseMeteoraDammLog(log, signature, slot, txIndex, blockTimeUs, grpcRecvUs);
    default: {
      const raydium_launchlab = parseRaydiumLaunchlabFromDiscriminator(disc, data, metadata);
      if (raydium_launchlab) return applyActualEventTypeFilter(raydium_launchlab, eventTypeFilter);
      const dlmm = parseDlmmFromDecoded(buf, metadata);
      if (dlmm) return applyActualEventTypeFilter(dlmm, eventTypeFilter);
      return null;
    }
  }
}

/** 单行日志统一解析；`txIndex` 与 Rust gRPC `parse_logs(..., tx_idx, ...)` / `info.index` 对齐。 */
export function parseLogUnified(
  log: string,
  signature: string,
  slot: number,
  blockTimeUs: number | undefined,
  txIndex: number = 0
): DexEvent | null {
  const grpcRecvUs = nowUs();
  return parseLogOptimized(log, signature, slot, txIndex, blockTimeUs, grpcRecvUs, undefined, false, undefined);
}

export function parseLogOptimizedWithProgramId(
  log: string,
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number,
  eventTypeFilter: EventTypeFilter | undefined,
  isCreatedBuy: boolean,
  recentBlockhash: Uint8Array | undefined,
  programId: string | undefined
): DexEvent | null {
  return parseLogOptimized(
    log,
    signature,
    slot,
    txIndex,
    blockTimeUs,
    grpcRecvUs,
    eventTypeFilter,
    isCreatedBuy,
    recentBlockhash,
    programId
  );
}

export function parseInvokeInfo(log: string): { programId: string; depth: number } | null {
  const prefix = "Program ";
  const start = log.indexOf(prefix);
  if (start < 0) return null;
  const invoke = " invoke [";
  const invokeIdx = log.indexOf(invoke, start + prefix.length);
  if (invokeIdx < 0) return null;
  const programId = log.slice(start + prefix.length, invokeIdx);
  const depthStart = invokeIdx + invoke.length;
  const depthEnd = log.indexOf("]", depthStart);
  if (depthEnd < 0) return null;
  const depth = Number(log.slice(depthStart, depthEnd));
  if (!programId || !Number.isInteger(depth) || depth <= 0) return null;
  return { programId, depth };
}

export function parseProgramCompleteInfo(log: string): string | null {
  const prefix = "Program ";
  const start = log.indexOf(prefix);
  if (start < 0) return null;
  const success = " success";
  const failed = " failed:";
  const successIdx = log.indexOf(success, start + prefix.length);
  if (successIdx >= 0) return log.slice(start + prefix.length, successIdx);
  const failedIdx = log.indexOf(failed, start + prefix.length);
  if (failedIdx >= 0) return log.slice(start + prefix.length, failedIdx);
  return null;
}
