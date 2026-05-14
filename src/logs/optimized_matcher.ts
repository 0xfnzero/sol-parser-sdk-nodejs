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
import { parseDlmmFromDecoded } from "./meteora_dlmm.js";
import { parseBonkFromDiscriminator } from "./raydium_launchpad.js";
import type { EventType, EventTypeFilter } from "../grpc/types.js";
import { readDiscriminatorU64 } from "../util/binary.js";
import { PROGRAM_LOG_DISC as DISC } from "./program_log_discriminators.js";

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

function filterAllowsUnknownSupported(filter: EventTypeFilter | undefined): boolean {
  return !filter?.include_only;
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

function applyPumpfunSecondaryFilter(ev: DexEvent | null, filter: EventTypeFilter | undefined): DexEvent | null {
  if (!ev || !filter) return ev;
  if (filter.include_only?.length) {
    const hasSpecific = filter.include_only.some((t) =>
      ["PumpFunBuy", "PumpFunSell", "PumpFunBuyExactSolIn", "PumpFunCreate", "PumpFunCreateV2"].includes(t)
    );
    if (hasSpecific && !pumpfunTradeMatchesFilter(ev, filter.include_only)) return null;
  }
  const actual = eventTypeFromDexEvent(ev);
  if (actual && !filter.shouldInclude(actual)) return null;
  return ev;
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
  recentBlockhash?: Uint8Array
): DexEvent | null {
  const buf = decodeProgramDataLine(log);
  if (!buf) return null;
  const disc = readDiscriminatorU64(buf);
  if (disc === null) return null;
  const data = buf.subarray(8);
  const rb =
    recentBlockhash && recentBlockhash.length > 0 ? bs58.encode(recentBlockhash) : undefined;
  const metadata: EventMetadata = makeMetadata(signature, slot, txIndex, blockTimeUs, grpcRecvUs, rb);

  const et = discriminatorToEventType(disc);
  if (eventTypeFilter && et !== null) {
    if (!eventTypeFilter.shouldInclude(et)) return null;
  } else if (eventTypeFilter && et === null) {
    if (!filterAllowsUnknownSupported(eventTypeFilter)) return null;
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
      const bonk = parseBonkFromDiscriminator(disc, data, metadata);
      if (bonk) return bonk;
      const dlmm = parseDlmmFromDecoded(buf, metadata);
      if (dlmm) return dlmm;
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
