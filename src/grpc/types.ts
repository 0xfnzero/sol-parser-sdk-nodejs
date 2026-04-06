/** gRPC 订阅顺序模式 */
export type OrderMode = "Unordered" | "Ordered" | "StreamingOrdered" | "MicroBatch";

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
}

export interface SubscribeCallbacks {
  onUpdate?: (update: SubscribeUpdate) => void;
  onError?: (err: Error) => void;
  onEnd?: () => void;
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

export interface TransactionFilter {
  account_include: string[];
  account_exclude: string[];
  account_required: string[];
}

export function newTransactionFilter(): TransactionFilter {
  return { account_include: [], account_exclude: [], account_required: [] };
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
  | "MeteoraDammV2ClosePosition"
  | "MeteoraDammV2InitializePool"
  // Meteora DLMM
  | "MeteoraDlmmSwap"
  | "MeteoraDlmmAddLiquidity"
  | "MeteoraDlmmRemoveLiquidity"
  | "MeteoraDlmmInitializePool"
  | "MeteoraDlmmInitializeBinArray"
  | "MeteoraDlmmCreatePosition"
  | "MeteoraDlmmClosePosition"
  | "MeteoraDlmmClaimFee"
  // Bonk
  | "BonkTrade"
  | "BonkPoolCreate"
  | "BonkMigrateAmm"
  // Account types
  | "TokenAccount"
  | "TokenInfo"
  | "NonceAccount"
  | "AccountPumpSwapGlobalConfig"
  | "AccountPumpSwapPool";

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
  "MeteoraDammV2ClosePosition",
  "MeteoraDammV2InitializePool",
  // Meteora DLMM
  "MeteoraDlmmSwap",
  "MeteoraDlmmAddLiquidity",
  "MeteoraDlmmRemoveLiquidity",
  "MeteoraDlmmInitializePool",
  "MeteoraDlmmInitializeBinArray",
  "MeteoraDlmmCreatePosition",
  "MeteoraDlmmClosePosition",
  "MeteoraDlmmClaimFee",
  // Bonk
  "BonkTrade",
  "BonkPoolCreate",
  "BonkMigrateAmm",
  // Account types
  "TokenAccount",
  "TokenInfo",
  "NonceAccount",
  "AccountPumpSwapGlobalConfig",
  "AccountPumpSwapPool",
];

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
        return include_only.some((t) =>
          ["PumpFunBuy", "PumpFunSell", "PumpFunBuyExactSolIn"].includes(t)
        );
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
      return !exclude_types.includes(eventType);
    },
  };
}

/** 过滤器是否包含 PumpFun 相关类型 */
export function eventTypeFilterIncludesPumpfun(filter: EventTypeFilter): boolean {
  if (filter.include_only) {
    return filter.include_only.some((t) =>
      [
        "PumpFunTrade",
        "PumpFunBuy",
        "PumpFunSell",
        "PumpFunBuyExactSolIn",
        "PumpFunCreate",
        "PumpFunCreateV2",
        "PumpFunComplete",
        "PumpFunMigrate",
      ].includes(t)
    );
  }
  if (filter.exclude_types) {
    return !filter.exclude_types.some((t) =>
      [
        "PumpFunTrade",
        "PumpFunBuy",
        "PumpFunSell",
        "PumpFunBuyExactSolIn",
        "PumpFunCreate",
        "PumpFunCreateV2",
        "PumpFunComplete",
        "PumpFunMigrate",
      ].includes(t)
    );
  }
  return true;
}

/** 过滤器是否包含 PumpSwap 相关类型 */
export function eventTypeFilterIncludesPumpswap(filter: EventTypeFilter): boolean {
  if (filter.include_only) {
    return filter.include_only.some((t) =>
      [
        "PumpSwapBuy",
        "PumpSwapSell",
        "PumpSwapCreatePool",
        "PumpSwapLiquidityAdded",
        "PumpSwapLiquidityRemoved",
      ].includes(t)
    );
  }
  if (filter.exclude_types) {
    return !filter.exclude_types.some((t) =>
      [
        "PumpSwapBuy",
        "PumpSwapSell",
        "PumpSwapCreatePool",
        "PumpSwapLiquidityAdded",
        "PumpSwapLiquidityRemoved",
      ].includes(t)
    );
  }
  return true;
}

/** 过滤器是否包含 Meteora DAMM V2 相关类型 */
export function eventTypeFilterIncludesMeteoraDammV2(filter: EventTypeFilter): boolean {
  if (filter.include_only) {
    return filter.include_only.some((t) =>
      [
        "MeteoraDammV2Swap",
        "MeteoraDammV2AddLiquidity",
        "MeteoraDammV2CreatePosition",
        "MeteoraDammV2ClosePosition",
        "MeteoraDammV2InitializePool",
        "MeteoraDammV2RemoveLiquidity",
      ].includes(t)
    );
  }
  if (filter.exclude_types) {
    return !filter.exclude_types.some((t) =>
      [
        "MeteoraDammV2Swap",
        "MeteoraDammV2AddLiquidity",
        "MeteoraDammV2CreatePosition",
        "MeteoraDammV2ClosePosition",
        "MeteoraDammV2InitializePool",
        "MeteoraDammV2RemoveLiquidity",
      ].includes(t)
    );
  }
  return true;
}

/** 过滤器是否包含 Raydium CLMM 相关类型 */
export function eventTypeFilterIncludesRaydiumClmm(filter: EventTypeFilter): boolean {
  if (filter.include_only) {
    return filter.include_only.some((t) =>
      [
        "RaydiumClmmSwap",
        "RaydiumClmmIncreaseLiquidity",
        "RaydiumClmmDecreaseLiquidity",
        "RaydiumClmmCreatePool",
      ].includes(t)
    );
  }
  if (filter.exclude_types) {
    return !filter.exclude_types.some((t) =>
      [
        "RaydiumClmmSwap",
        "RaydiumClmmIncreaseLiquidity",
        "RaydiumClmmDecreaseLiquidity",
        "RaydiumClmmCreatePool",
      ].includes(t)
    );
  }
  return true;
}

/** 过滤器是否包含 Raydium CPMM 相关类型 */
export function eventTypeFilterIncludesRaydiumCpmm(filter: EventTypeFilter): boolean {
  if (filter.include_only) {
    return filter.include_only.some((t) =>
      [
        "RaydiumCpmmSwap",
        "RaydiumCpmmDeposit",
        "RaydiumCpmmWithdraw",
      ].includes(t)
    );
  }
  if (filter.exclude_types) {
    return !filter.exclude_types.some((t) =>
      [
        "RaydiumCpmmSwap",
        "RaydiumCpmmDeposit",
        "RaydiumCpmmWithdraw",
      ].includes(t)
    );
  }
  return true;
}

/** 过滤器是否包含 Raydium AMM V4 相关类型 */
export function eventTypeFilterIncludesRaydiumAmmV4(filter: EventTypeFilter): boolean {
  if (filter.include_only) {
    return filter.include_only.some((t) =>
      ["RaydiumAmmV4Swap"].includes(t)
    );
  }
  if (filter.exclude_types) {
    return !filter.exclude_types.some((t) =>
      ["RaydiumAmmV4Swap"].includes(t)
    );
  }
  return true;
}

/** 过滤器是否包含 Orca Whirlpool 相关类型 */
export function eventTypeFilterIncludesOrcaWhirlpool(filter: EventTypeFilter): boolean {
  if (filter.include_only) {
    return filter.include_only.some((t) =>
      [
        "OrcaWhirlpoolSwap",
        "OrcaWhirlpoolLiquidityIncreased",
        "OrcaWhirlpoolLiquidityDecreased",
      ].includes(t)
    );
  }
  if (filter.exclude_types) {
    return !filter.exclude_types.some((t) =>
      [
        "OrcaWhirlpoolSwap",
        "OrcaWhirlpoolLiquidityIncreased",
        "OrcaWhirlpoolLiquidityDecreased",
      ].includes(t)
    );
  }
  return true;
}

/** 过滤器是否包含 Bonk Launchpad 相关类型 */
export function eventTypeFilterIncludesBonk(filter: EventTypeFilter): boolean {
  if (filter.include_only) {
    return filter.include_only.some((t) =>
      ["BonkTrade", "BonkPoolCreate"].includes(t)
    );
  }
  if (filter.exclude_types) {
    return !filter.exclude_types.some((t) =>
      ["BonkTrade", "BonkPoolCreate"].includes(t)
    );
  }
  return true;
}

/**
 * `parseInstructionUnified` 前置白名单：仅当 `include_only` 与下列指令相关类型有交集时才解析指令。
 * 若白名单中不含下列任一类型，则整条指令解析入口返回 null。
 */
export function eventTypeFilterAllowsInstructionParsing(includeOnly: EventType[]): boolean {
  const ix: EventType[] = [
    "PumpFunMigrate",
    "MeteoraDammV2Swap",
    "MeteoraDammV2AddLiquidity",
    "MeteoraDammV2CreatePosition",
    "MeteoraDammV2ClosePosition",
    "MeteoraDammV2InitializePool",
    "MeteoraDammV2RemoveLiquidity",
  ];
  return includeOnly.some((t) => ix.includes(t));
}
