import type { SubscribeRequestFilterAccountsFilter } from "@triton-one/yellowstone-grpc";
import type { DexEvent } from "../core/dex_event.js";

/** gRPC 订阅顺序模式 */
export type OrderMode = "Unordered" | "Ordered" | "StreamingOrdered" | "MicroBatch";

/** 与 Rust `grpc::types::Protocol` 一致 */
export type Protocol =
  | "PumpFun"
  | "PumpSwap"
  | "PumpFees"
  | "RaydiumLaunchlab"
  | "RaydiumCpmm"
  | "RaydiumClmm"
  | "RaydiumAmmV4"
  | "OrcaWhirlpool"
  | "MeteoraPools"
  | "MeteoraDammV2"
  | "MeteoraDlmm"
  | "MeteoraDbc";

// ─── gRPC 流式更新类型 ────────────────────────────────────────────────────────

export type SlotStatus =
  | "Processed"
  | "Confirmed"
  | "Finalized"
  | "FirstShredReceived"
  | "Completed"
  | "CreatedBank"
  | "Dead";

export interface SubscribeUpdateAccountInfo {
  pubkey: Uint8Array;
  lamports: string | bigint;
  owner: Uint8Array;
  executable: boolean;
  rentEpoch: string | bigint;
  data: Uint8Array;
  writeVersion: string | bigint;
  txnSignature?: Uint8Array;
}

export interface SubscribeUpdateAccount {
  slot: string | bigint;
  isStartup: boolean;
  account?: SubscribeUpdateAccountInfo;
}

export interface SubscribeUpdateSlot {
  slot: string | bigint;
  parent?: string | bigint;
  status: SlotStatus;
  deadError?: string;
}

export interface SubscribeUpdateTransactionInfo {
  signature: Uint8Array;
  isVote: boolean;
  /** 原始 proto Transaction 对象 */
  transactionRaw?: unknown;
  /** 原始 proto TransactionStatusMeta 对象（含 logMessages） */
  metaRaw?: {
    logMessages?: string[];
    logMessagesNone?: boolean;
    err?: unknown;
    preBalances?: string[];
    postBalances?: string[];
    [key: string]: unknown;
  };
  index: string | bigint;
}

export interface SubscribeUpdateTransaction {
  slot: string | bigint;
  transaction?: SubscribeUpdateTransactionInfo;
}

export interface SubscribeUpdateBlock {
  slot: string | bigint;
  blockhash: string;
  parentSlot: string | bigint;
  parentBlockhash: string;
  executedTransactionCount: string | bigint;
}

export interface SubscribeUpdateBlockMeta {
  slot: string | bigint;
  blockhash: string;
  parentSlot: string | bigint;
  parentBlockhash: string;
  executedTransactionCount: string | bigint;
}

export interface SubscribeUpdatePing {}
export interface SubscribeUpdatePong {
  id: number;
}

export interface SubscribeUpdate {
  filters: string[];
  account?: SubscribeUpdateAccount;
  slot?: SubscribeUpdateSlot;
  transaction?: SubscribeUpdateTransaction;
  block?: SubscribeUpdateBlock;
  blockMeta?: SubscribeUpdateBlockMeta;
  ping?: SubscribeUpdatePing;
  pong?: SubscribeUpdatePong;
  /** Yellowstone SubscribeUpdate.created_at, Unix timestamp in microseconds. */
  createdAtUs?: number;
}

export interface SubscribeCallbacks {
  onUpdate?: (update: SubscribeUpdate) => void;
  onError?: (err: Error) => void;
  onEnd?: () => void;
  /**
   * 是否在流断开后自动重连（指数退避，与 Rust `subscribe_dex_events` 一致）。
   * 默认 `true`。为 `false` 时保持单次连接的旧行为。
   */
  autoReconnect?: boolean;
}

export interface ClientConfig {
  enable_metrics: boolean;
  connection_timeout_ms: number;
  request_timeout_ms: number;
  enable_tls: boolean;
  max_retries: number;
  retry_delay_ms: number;
  max_concurrent_streams: number;
  keep_alive_interval_ms: number;
  keep_alive_timeout_ms: number;
  buffer_size: number;
  order_mode: OrderMode;
  order_timeout_ms: number;
  micro_batch_us: number;
}

/** 与 Rust `grpc::config` 中 `StreamingConfig` 别名（即 `ClientConfig`）一致 */
export type StreamingConfig = ClientConfig;

export function defaultClientConfig(): ClientConfig {
  return {
    enable_metrics: false,
    connection_timeout_ms: 8000,
    request_timeout_ms: 15000,
    enable_tls: true,
    max_retries: 3,
    retry_delay_ms: 1000,
    max_concurrent_streams: 100,
    keep_alive_interval_ms: 30000,
    keep_alive_timeout_ms: 5000,
    buffer_size: 8192,
    order_mode: "Unordered",
    order_timeout_ms: 100,
    micro_batch_us: 100,
  };
}

/** 与 Rust `ClientConfig::low_latency` 一致 */
export function lowLatencyClientConfig(): ClientConfig {
  return {
    enable_metrics: false,
    connection_timeout_ms: 5000,
    request_timeout_ms: 10_000,
    enable_tls: true,
    max_retries: 1,
    retry_delay_ms: 100,
    max_concurrent_streams: 200,
    keep_alive_interval_ms: 10_000,
    keep_alive_timeout_ms: 2000,
    buffer_size: 16384,
    order_mode: "Unordered",
    order_timeout_ms: 50,
    micro_batch_us: 50,
  };
}

/** 与 Rust `ClientConfig::high_throughput` 一致 */
export function highThroughputClientConfig(): ClientConfig {
  return {
    enable_metrics: true,
    connection_timeout_ms: 10_000,
    request_timeout_ms: 30_000,
    enable_tls: true,
    max_retries: 5,
    retry_delay_ms: 2000,
    max_concurrent_streams: 500,
    keep_alive_interval_ms: 60_000,
    keep_alive_timeout_ms: 10_000,
    buffer_size: 32768,
    order_mode: "Unordered",
    order_timeout_ms: 200,
    micro_batch_us: 200,
  };
}

export interface TransactionFilter {
  account_include: string[];
  account_exclude: string[];
  account_required: string[];
}

export function newTransactionFilter(): TransactionFilter {
  return { account_include: [], account_exclude: [], account_required: [] };
}

/** 与 Rust `TransactionFilter::from_program_ids` 一致 */
export function transactionFilterFromProgramIds(programIds: string[]): TransactionFilter {
  return {
    account_include: [...programIds],
    account_exclude: [],
    account_required: [],
  };
}

/** 与 Rust `grpc::AccountFilter` 一致（Yellowstone 账户订阅） */
export interface AccountFilter {
  account: string[];
  owner: string[];
  filters: SubscribeRequestFilterAccountsFilter[];
}

/** 与 Rust `grpc::types::AccountFilterMemcmp` / `AccountFilterData` 一致（文档与扩展用） */
export interface AccountFilterMemcmp {
  offset: number;
  bytes: Uint8Array;
}

export interface AccountFilterData {
  memcmp?: AccountFilterMemcmp;
  datasize?: number;
}

export function newAccountFilter(): AccountFilter {
  return { account: [], owner: [], filters: [] };
}

/** 与 Rust `grpc::types::SlotFilter` 一致 */
export interface SlotFilter {
  min_slot?: number;
  max_slot?: number;
}

export function newSlotFilter(): SlotFilter {
  return {};
}

export function slotFilterMinSlot(filter: SlotFilter, slot: number): SlotFilter {
  return { ...filter, min_slot: slot };
}

export function slotFilterMaxSlot(filter: SlotFilter, slot: number): SlotFilter {
  return { ...filter, max_slot: slot };
}

/** 与 Rust `AccountFilter::from_program_owners` 一致 */
export function accountFilterFromProgramOwners(programIds: string[]): AccountFilter {
  return { account: [], owner: [...programIds], filters: [] };
}

/**
 * 构造 memcmp 账户过滤器（与 Rust `account_filter_memcmp` 一致）。
 * ATA 常在 offset 0 放 mint；PumpSwap 池子等常在 offset 32。
 */
export function accountFilterMemcmp(
  offset: number,
  bytes: Uint8Array
): SubscribeRequestFilterAccountsFilter {
  return {
    memcmp: {
      offset: String(offset),
      bytes,
    },
  };
}

/** 事件类型过滤标签 */
export type EventType =
  // Block
  | "BlockMeta"
  // PumpFun
  | "PumpFunTrade"
  | "PumpFunBuy"
  | "PumpFunSell"
  | "PumpFunBuyExactSolIn"
  | "PumpFunCreate"
  | "PumpFunCreateV2"
  | "PumpFunComplete"
  | "PumpFunMigrate"
  | "PumpFeesCreateFeeSharingConfig"
  | "PumpFeesInitializeFeeConfig"
  | "PumpFeesResetFeeSharingConfig"
  | "PumpFeesRevokeFeeSharingAuthority"
  | "PumpFeesTransferFeeSharingAuthority"
  | "PumpFeesUpdateAdmin"
  | "PumpFeesUpdateFeeConfig"
  | "PumpFeesUpdateFeeShares"
  | "PumpFeesUpsertFeeTiers"
  | "PumpFunMigrateBondingCurveCreator"
  // PumpSwap
  | "PumpSwapTrade"
  | "PumpSwapBuy"
  | "PumpSwapSell"
  | "PumpSwapCreatePool"
  | "PumpSwapLiquidityAdded"
  | "PumpSwapLiquidityRemoved"
  // Raydium CLMM
  | "RaydiumClmmSwap"
  | "RaydiumClmmIncreaseLiquidity"
  | "RaydiumClmmDecreaseLiquidity"
  | "RaydiumClmmCreatePool"
  | "RaydiumClmmOpenPosition"
  | "RaydiumClmmOpenPositionWithTokenExtNft"
  | "RaydiumClmmClosePosition"
  | "RaydiumClmmCollectFee"
  // Raydium CPMM
  | "RaydiumCpmmSwap"
  | "RaydiumCpmmDeposit"
  | "RaydiumCpmmWithdraw"
  | "RaydiumCpmmInitialize"
  // Raydium AMM V4
  | "RaydiumAmmV4Swap"
  | "RaydiumAmmV4Deposit"
  | "RaydiumAmmV4Withdraw"
  | "RaydiumAmmV4WithdrawPnl"
  | "RaydiumAmmV4Initialize2"
  // Orca Whirlpool
  | "OrcaWhirlpoolSwap"
  | "OrcaWhirlpoolLiquidityIncreased"
  | "OrcaWhirlpoolLiquidityDecreased"
  | "OrcaWhirlpoolPoolInitialized"
  // Meteora Pools
  | "MeteoraPoolsSwap"
  | "MeteoraPoolsAddLiquidity"
  | "MeteoraPoolsRemoveLiquidity"
  | "MeteoraPoolsBootstrapLiquidity"
  | "MeteoraPoolsPoolCreated"
  | "MeteoraPoolsSetPoolFees"
  // Meteora DAMM V2
  | "MeteoraDammV2Swap"
  | "MeteoraDammV2AddLiquidity"
  | "MeteoraDammV2RemoveLiquidity"
  | "MeteoraDammV2CreatePosition"
  | "MeteoraDammV2InitializePool"
  | "MeteoraDammV2ClosePosition"
  // Meteora DBC
  | "MeteoraDbcSwap"
  | "MeteoraDbcInitializePool"
  | "MeteoraDbcCurveComplete"
  // Meteora DLMM
  | "MeteoraDlmmSwap"
  | "MeteoraDlmmAddLiquidity"
  | "MeteoraDlmmRemoveLiquidity"
  | "MeteoraDlmmInitializePool"
  | "MeteoraDlmmInitializeBinArray"
  | "MeteoraDlmmCreatePosition"
  | "MeteoraDlmmClosePosition"
  | "MeteoraDlmmClaimFee"
  // RaydiumLaunchlab
  | "RaydiumLaunchlabTrade"
  | "RaydiumLaunchlabPoolCreate"
  | "RaydiumLaunchlabMigrateAmm"
  // Account types
  | "TokenAccount"
  | "TokenInfo"
  | "NonceAccount"
  | "AccountPumpFunGlobal"
  | "AccountPumpFunBondingCurve"
  | "AccountPumpFunFeeConfig"
  | "AccountPumpFunSharingConfig"
  | "AccountPumpFunGlobalVolumeAccumulator"
  | "AccountPumpFunUserVolumeAccumulator"
  | "AccountPumpSwapGlobalConfig"
  | "AccountPumpSwapPool"
  | "AccountRaydiumClmmAmmConfig"
  | "AccountRaydiumClmmPoolState"
  | "AccountRaydiumClmmTickArrayState"
  | "AccountRaydiumCpmmAmmConfig"
  | "AccountRaydiumCpmmPoolState"
  | "AccountOrcaWhirlpool"
  | "AccountOrcaPosition"
  | "AccountOrcaTickArray"
  | "AccountOrcaFeeTier"
  | "AccountOrcaWhirlpoolsConfig";

/** 与 Rust `grpc::EventType`（由 `StreamingEventType` 导出）一致 */
export type StreamingEventType = EventType;

/** 所有事件类型列表 */
export const ALL_EVENT_TYPES: EventType[] = [
  // Block
  "BlockMeta",
  // PumpFun
  "PumpFunTrade",
  "PumpFunBuy",
  "PumpFunSell",
  "PumpFunBuyExactSolIn",
  "PumpFunCreate",
  "PumpFunCreateV2",
  "PumpFunComplete",
  "PumpFunMigrate",
  "PumpFeesCreateFeeSharingConfig",
  "PumpFeesInitializeFeeConfig",
  "PumpFeesResetFeeSharingConfig",
  "PumpFeesRevokeFeeSharingAuthority",
  "PumpFeesTransferFeeSharingAuthority",
  "PumpFeesUpdateAdmin",
  "PumpFeesUpdateFeeConfig",
  "PumpFeesUpdateFeeShares",
  "PumpFeesUpsertFeeTiers",
  "PumpFunMigrateBondingCurveCreator",
  // PumpSwap
  "PumpSwapTrade",
  "PumpSwapBuy",
  "PumpSwapSell",
  "PumpSwapCreatePool",
  "PumpSwapLiquidityAdded",
  "PumpSwapLiquidityRemoved",
  // Raydium CLMM
  "RaydiumClmmSwap",
  "RaydiumClmmIncreaseLiquidity",
  "RaydiumClmmDecreaseLiquidity",
  "RaydiumClmmCreatePool",
  "RaydiumClmmOpenPosition",
  "RaydiumClmmOpenPositionWithTokenExtNft",
  "RaydiumClmmClosePosition",
  "RaydiumClmmCollectFee",
  // Raydium CPMM
  "RaydiumCpmmSwap",
  "RaydiumCpmmDeposit",
  "RaydiumCpmmWithdraw",
  "RaydiumCpmmInitialize",
  // Raydium AMM V4
  "RaydiumAmmV4Swap",
  "RaydiumAmmV4Deposit",
  "RaydiumAmmV4Withdraw",
  "RaydiumAmmV4WithdrawPnl",
  "RaydiumAmmV4Initialize2",
  // Orca Whirlpool
  "OrcaWhirlpoolSwap",
  "OrcaWhirlpoolLiquidityIncreased",
  "OrcaWhirlpoolLiquidityDecreased",
  "OrcaWhirlpoolPoolInitialized",
  // Meteora Pools
  "MeteoraPoolsSwap",
  "MeteoraPoolsAddLiquidity",
  "MeteoraPoolsRemoveLiquidity",
  "MeteoraPoolsBootstrapLiquidity",
  "MeteoraPoolsPoolCreated",
  "MeteoraPoolsSetPoolFees",
  // Meteora DAMM V2
  "MeteoraDammV2Swap",
  "MeteoraDammV2AddLiquidity",
  "MeteoraDammV2RemoveLiquidity",
  "MeteoraDammV2CreatePosition",
  "MeteoraDammV2InitializePool",
  "MeteoraDammV2ClosePosition",
  // Meteora DBC
  "MeteoraDbcSwap",
  "MeteoraDbcInitializePool",
  "MeteoraDbcCurveComplete",
  // Meteora DLMM
  "MeteoraDlmmSwap",
  "MeteoraDlmmAddLiquidity",
  "MeteoraDlmmRemoveLiquidity",
  "MeteoraDlmmInitializePool",
  "MeteoraDlmmInitializeBinArray",
  "MeteoraDlmmCreatePosition",
  "MeteoraDlmmClosePosition",
  "MeteoraDlmmClaimFee",
  // RaydiumLaunchlab
  "RaydiumLaunchlabTrade",
  "RaydiumLaunchlabPoolCreate",
  "RaydiumLaunchlabMigrateAmm",
  // Account types
  "TokenAccount",
  "TokenInfo",
  "NonceAccount",
  "AccountPumpFunGlobal",
  "AccountPumpFunBondingCurve",
  "AccountPumpFunFeeConfig",
  "AccountPumpFunSharingConfig",
  "AccountPumpFunGlobalVolumeAccumulator",
  "AccountPumpFunUserVolumeAccumulator",
  "AccountPumpSwapGlobalConfig",
  "AccountPumpSwapPool",
  "AccountRaydiumClmmAmmConfig",
  "AccountRaydiumClmmPoolState",
  "AccountRaydiumClmmTickArrayState",
  "AccountRaydiumCpmmAmmConfig",
  "AccountRaydiumCpmmPoolState",
  "AccountOrcaWhirlpool",
  "AccountOrcaPosition",
  "AccountOrcaTickArray",
  "AccountOrcaFeeTier",
  "AccountOrcaWhirlpoolsConfig",
];

const ALL_EVENT_TYPE_SET = new Set<string>(ALL_EVENT_TYPES);
const PUMPFUN_BUY_FAMILY: readonly EventType[] = ["PumpFunBuy", "PumpFunBuyExactSolIn"];
const PUMPFUN_TRADE_FAMILY: readonly EventType[] = [
  "PumpFunBuy",
  "PumpFunSell",
  "PumpFunBuyExactSolIn",
];
const PUMPFUN_CREATE_FAMILY: readonly EventType[] = ["PumpFunCreate", "PumpFunCreateV2"];
const PUMPSWAP_TRADE_FAMILY: readonly EventType[] = ["PumpSwapBuy", "PumpSwapSell"];
const PUMP_FEES_EVENT_TYPES: readonly EventType[] = [
  "PumpFeesCreateFeeSharingConfig",
  "PumpFeesInitializeFeeConfig",
  "PumpFeesResetFeeSharingConfig",
  "PumpFeesRevokeFeeSharingAuthority",
  "PumpFeesTransferFeeSharingAuthority",
  "PumpFeesUpdateAdmin",
  "PumpFeesUpdateFeeConfig",
  "PumpFeesUpdateFeeShares",
  "PumpFeesUpsertFeeTiers",
];
const PUMPFUN_FILTER_TYPES: readonly EventType[] = [
  "PumpFunTrade",
  "PumpFunBuy",
  "PumpFunSell",
  "PumpFunBuyExactSolIn",
  "PumpFunCreate",
  "PumpFunCreateV2",
  "PumpFunComplete",
  "PumpFunMigrate",
  "PumpFunMigrateBondingCurveCreator",
];
const PUMPSWAP_FILTER_TYPES: readonly EventType[] = [
  "PumpSwapTrade",
  "PumpSwapBuy",
  "PumpSwapSell",
  "PumpSwapCreatePool",
  "PumpSwapLiquidityAdded",
  "PumpSwapLiquidityRemoved",
];
const METEORA_DAMM_V2_FILTER_TYPES: readonly EventType[] = [
  "MeteoraDammV2Swap",
  "MeteoraDammV2AddLiquidity",
  "MeteoraDammV2RemoveLiquidity",
  "MeteoraDammV2CreatePosition",
  "MeteoraDammV2InitializePool",
  "MeteoraDammV2ClosePosition",
];
const METEORA_DBC_FILTER_TYPES: readonly EventType[] = [
  "MeteoraDbcSwap",
  "MeteoraDbcInitializePool",
  "MeteoraDbcCurveComplete",
];
const METEORA_POOLS_FILTER_TYPES: readonly EventType[] = [
  "MeteoraPoolsSwap",
  "MeteoraPoolsAddLiquidity",
  "MeteoraPoolsRemoveLiquidity",
  "MeteoraPoolsBootstrapLiquidity",
  "MeteoraPoolsPoolCreated",
  "MeteoraPoolsSetPoolFees",
];
const METEORA_DLMM_FILTER_TYPES: readonly EventType[] = [
  "MeteoraDlmmSwap",
  "MeteoraDlmmAddLiquidity",
  "MeteoraDlmmRemoveLiquidity",
  "MeteoraDlmmInitializePool",
  "MeteoraDlmmInitializeBinArray",
  "MeteoraDlmmCreatePosition",
  "MeteoraDlmmClosePosition",
  "MeteoraDlmmClaimFee",
];
const RAYDIUM_CLMM_FILTER_TYPES: readonly EventType[] = [
  "RaydiumClmmSwap",
  "RaydiumClmmIncreaseLiquidity",
  "RaydiumClmmDecreaseLiquidity",
  "RaydiumClmmCreatePool",
  "RaydiumClmmOpenPosition",
  "RaydiumClmmOpenPositionWithTokenExtNft",
  "RaydiumClmmClosePosition",
  "RaydiumClmmCollectFee",
];
const RAYDIUM_CPMM_FILTER_TYPES: readonly EventType[] = [
  "RaydiumCpmmSwap",
  "RaydiumCpmmDeposit",
  "RaydiumCpmmWithdraw",
  "RaydiumCpmmInitialize",
];
const RAYDIUM_AMM_V4_FILTER_TYPES: readonly EventType[] = [
  "RaydiumAmmV4Swap",
  "RaydiumAmmV4Deposit",
  "RaydiumAmmV4Withdraw",
  "RaydiumAmmV4WithdrawPnl",
  "RaydiumAmmV4Initialize2",
];
const ORCA_WHIRLPOOL_FILTER_TYPES: readonly EventType[] = [
  "OrcaWhirlpoolSwap",
  "OrcaWhirlpoolLiquidityIncreased",
  "OrcaWhirlpoolLiquidityDecreased",
  "OrcaWhirlpoolPoolInitialized",
];
const RAYDIUM_LAUNCHLAB_FILTER_TYPES: readonly EventType[] = [
  "RaydiumLaunchlabTrade",
  "RaydiumLaunchlabPoolCreate",
  "RaydiumLaunchlabMigrateAmm",
];
const INSTRUCTION_EVENT_TYPES: readonly EventType[] = [
  ...PUMPFUN_FILTER_TYPES,
  ...PUMP_FEES_EVENT_TYPES,
  ...PUMPSWAP_FILTER_TYPES,
  ...METEORA_DAMM_V2_FILTER_TYPES,
  ...METEORA_POOLS_FILTER_TYPES,
  ...METEORA_DLMM_FILTER_TYPES,
  ...RAYDIUM_CLMM_FILTER_TYPES,
  ...RAYDIUM_CPMM_FILTER_TYPES,
  ...RAYDIUM_AMM_V4_FILTER_TYPES,
  ...ORCA_WHIRLPOOL_FILTER_TYPES,
  ...RAYDIUM_LAUNCHLAB_FILTER_TYPES,
];
const INSTRUCTION_EVENT_TYPE_SET = new Set<EventType>(INSTRUCTION_EVENT_TYPES);

const DEX_EVENT_TYPE_BY_VARIANT: Partial<Record<string, EventType>> = {
  PumpFunGlobalAccount: "AccountPumpFunGlobal",
  PumpFunBondingCurveAccount: "AccountPumpFunBondingCurve",
  PumpFunFeeConfigAccount: "AccountPumpFunFeeConfig",
  PumpFunSharingConfigAccount: "AccountPumpFunSharingConfig",
  PumpFunGlobalVolumeAccumulatorAccount: "AccountPumpFunGlobalVolumeAccumulator",
  PumpFunUserVolumeAccumulatorAccount: "AccountPumpFunUserVolumeAccumulator",
  PumpSwapGlobalConfigAccount: "AccountPumpSwapGlobalConfig",
  PumpSwapPoolAccount: "AccountPumpSwapPool",
};

export function eventTypeFromDexEvent(event: DexEvent): EventType | null {
  const variant = Object.keys(event)[0];
  if (!variant || variant === "Error") return null;
  const mapped = DEX_EVENT_TYPE_BY_VARIANT[variant];
  if (mapped) return mapped;
  return ALL_EVENT_TYPE_SET.has(variant) ? (variant as EventType) : null;
}

export function eventTypeFilterShouldIncludeDexEvent(
  filter: EventTypeFilter,
  event: DexEvent
): boolean {
  const eventType = eventTypeFromDexEvent(event);
  return eventType === null || filter.shouldInclude(eventType);
}

export interface EventTypeFilter {
  include_only?: EventType[];
  exclude_types?: EventType[];
  shouldInclude(eventType: EventType): boolean;
}

export function eventTypeFilterIncludeOnly(types: EventType[]): EventTypeFilter {
  const include_only = types;
  return {
    include_only,
    shouldInclude(eventType: EventType): boolean {
      if (include_only.includes(eventType)) return true;
      if (eventType === "PumpFunTrade") {
        return eventTypesIntersect(include_only, PUMPFUN_TRADE_FAMILY);
      }
      if (isPumpfunTradeConcrete(eventType)) {
        if (include_only.includes("PumpFunTrade")) return true;
        if (isPumpfunBuyFamily(eventType)) {
          return eventTypesIntersect(include_only, PUMPFUN_BUY_FAMILY);
        }
        return false;
      }
      if (isPumpfunCreateFamily(eventType)) {
        return eventTypesIntersect(include_only, PUMPFUN_CREATE_FAMILY);
      }
      if (isPumpswapTradeConcrete(eventType)) {
        return include_only.includes("PumpSwapTrade");
      }
      return false;
    },
  };
}

export function eventTypeFilterExclude(types: EventType[]): EventTypeFilter {
  const exclude_types = types;
  return {
    exclude_types,
    shouldInclude(eventType: EventType): boolean {
      if (exclude_types.includes(eventType)) return false;
      if (isPumpfunTradeConcrete(eventType) && exclude_types.includes("PumpFunTrade")) {
        return false;
      }
      if (
        isPumpfunBuyFamily(eventType) &&
        eventTypesIntersect(exclude_types, PUMPFUN_BUY_FAMILY)
      ) {
        return false;
      }
      if (
        isPumpfunCreateFamily(eventType) &&
        eventTypesIntersect(exclude_types, PUMPFUN_CREATE_FAMILY)
      ) {
        return false;
      }
      if (isPumpswapTradeConcrete(eventType) && exclude_types.includes("PumpSwapTrade")) {
        return false;
      }
      return true;
    },
  };
}

function eventTypesIntersect(
  types: readonly EventType[],
  candidates: readonly EventType[]
): boolean {
  return types.some((t) => candidates.includes(t));
}

function isPumpfunTradeConcrete(eventType: EventType): boolean {
  return (
    eventType === "PumpFunBuy" ||
    eventType === "PumpFunSell" ||
    eventType === "PumpFunBuyExactSolIn"
  );
}

function isPumpfunBuyFamily(eventType: EventType): boolean {
  return eventType === "PumpFunBuy" || eventType === "PumpFunBuyExactSolIn";
}

function isPumpfunCreateFamily(eventType: EventType): boolean {
  return eventType === "PumpFunCreate" || eventType === "PumpFunCreateV2";
}

function isPumpswapTradeConcrete(eventType: EventType): boolean {
  return eventType === "PumpSwapBuy" || eventType === "PumpSwapSell";
}

function eventTypeFilterIncludesAny(
  filter: EventTypeFilter,
  types: readonly EventType[]
): boolean {
  if (filter.include_only) {
    return eventTypesIntersect(filter.include_only, types);
  }
  if (filter.exclude_types) {
    return types.some((t) => filter.shouldInclude(t));
  }
  return types.some((t) => filter.shouldInclude(t));
}

/** 过滤器是否包含 PumpFun 相关类型 */
export function eventTypeFilterIncludesPumpfun(filter: EventTypeFilter): boolean {
  return eventTypeFilterIncludesAny(filter, PUMPFUN_FILTER_TYPES);
}

/** 过滤器是否包含 Pump Fees (`pfeeUx...`) 相关类型 */
export function eventTypeFilterIncludesPumpFees(filter: EventTypeFilter): boolean {
  return eventTypeFilterIncludesAny(filter, PUMP_FEES_EVENT_TYPES);
}

/** 过滤器是否包含 PumpSwap 相关类型 */
export function eventTypeFilterIncludesPumpswap(filter: EventTypeFilter): boolean {
  return eventTypeFilterIncludesAny(filter, PUMPSWAP_FILTER_TYPES);
}

/** 过滤器是否包含 Meteora DAMM V2 相关类型 */
export function eventTypeFilterIncludesMeteoraDammV2(filter: EventTypeFilter): boolean {
  return eventTypeFilterIncludesAny(filter, METEORA_DAMM_V2_FILTER_TYPES);
}

/** 过滤器是否包含 Meteora DBC 相关类型 */
export function eventTypeFilterIncludesMeteoraDbc(filter: EventTypeFilter): boolean {
  return eventTypeFilterIncludesAny(filter, METEORA_DBC_FILTER_TYPES);
}

/** 过滤器是否包含 Meteora Pools 相关类型 */
export function eventTypeFilterIncludesMeteoraPools(filter: EventTypeFilter): boolean {
  return eventTypeFilterIncludesAny(filter, METEORA_POOLS_FILTER_TYPES);
}

/** 过滤器是否包含 Meteora DLMM 相关类型 */
export function eventTypeFilterIncludesMeteoraDlmm(filter: EventTypeFilter): boolean {
  return eventTypeFilterIncludesAny(filter, METEORA_DLMM_FILTER_TYPES);
}

/** 过滤器是否包含 Raydium CLMM 相关类型 */
export function eventTypeFilterIncludesRaydiumClmm(filter: EventTypeFilter): boolean {
  return eventTypeFilterIncludesAny(filter, RAYDIUM_CLMM_FILTER_TYPES);
}

/** 过滤器是否包含 Raydium CPMM 相关类型 */
export function eventTypeFilterIncludesRaydiumCpmm(filter: EventTypeFilter): boolean {
  return eventTypeFilterIncludesAny(filter, RAYDIUM_CPMM_FILTER_TYPES);
}

/** 过滤器是否包含 Raydium AMM V4 相关类型 */
export function eventTypeFilterIncludesRaydiumAmmV4(filter: EventTypeFilter): boolean {
  return eventTypeFilterIncludesAny(filter, RAYDIUM_AMM_V4_FILTER_TYPES);
}

/** 过滤器是否包含 Orca Whirlpool 相关类型 */
export function eventTypeFilterIncludesOrcaWhirlpool(filter: EventTypeFilter): boolean {
  return eventTypeFilterIncludesAny(filter, ORCA_WHIRLPOOL_FILTER_TYPES);
}

/** 过滤器是否包含 Raydium LaunchLab 相关类型（与 Rust `includes_raydium_launchlab` 集合一致） */
export function eventTypeFilterIncludesRaydiumLaunchlab(filter: EventTypeFilter): boolean {
  return eventTypeFilterIncludesAny(filter, RAYDIUM_LAUNCHLAB_FILTER_TYPES);
}

/**
 * `parseInstructionUnified` 前置白名单：仅当 `include_only` 与下列指令相关类型有交集时才解析指令。
 * 若白名单中不含下列任一类型，则整条指令解析入口返回 null。
 */
export function eventTypeFilterAllowsInstructionParsing(includeOnly: EventType[]): boolean {
  return includeOnly.some((t) => INSTRUCTION_EVENT_TYPE_SET.has(t));
}
