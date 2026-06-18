import type { EventMetadata } from "./metadata.js";

/** 统一 DEX 事件：外部标签 JSON（单键对象）；键名清单见 `scripts/dex-event-variant-names.json` */
export type DexEvent =
  | { PumpFunCreate: PumpFunCreateTokenEvent }
  | { PumpFunCreateV2: PumpFunCreateV2TokenEvent }
  | { PumpFunTrade: PumpFunTradeEvent }
  | { PumpFunBuy: PumpFunTradeEvent }
  | { PumpFunSell: PumpFunTradeEvent }
  | { PumpFunBuyExactSolIn: PumpFunTradeEvent }
  | { PumpFunMigrate: PumpFunMigrateEvent }
  | { PumpFeesCreateFeeSharingConfig: PumpFeesCreateFeeSharingConfigEvent }
  | { PumpFeesInitializeFeeConfig: PumpFeesInitializeFeeConfigEvent }
  | { PumpFeesResetFeeSharingConfig: PumpFeesResetFeeSharingConfigEvent }
  | { PumpFeesRevokeFeeSharingAuthority: PumpFeesRevokeFeeSharingAuthorityEvent }
  | { PumpFeesTransferFeeSharingAuthority: PumpFeesTransferFeeSharingAuthorityEvent }
  | { PumpFeesUpdateAdmin: PumpFeesUpdateAdminEvent }
  | { PumpFeesUpdateFeeConfig: PumpFeesUpdateFeeConfigEvent }
  | { PumpFeesUpdateFeeShares: PumpFeesUpdateFeeSharesEvent }
  | { PumpFeesUpsertFeeTiers: PumpFeesUpsertFeeTiersEvent }
  | { PumpFunMigrateBondingCurveCreator: PumpFunMigrateBondingCurveCreatorEvent }
  | { PumpSwapTrade: PumpSwapTradeEvent }
  | { PumpSwapBuy: PumpSwapBuyEvent }
  | { PumpSwapSell: PumpSwapSellEvent }
  | { PumpSwapCreatePool: PumpSwapCreatePoolEvent }
  | { PumpSwapLiquidityAdded: PumpSwapLiquidityAdded }
  | { PumpSwapLiquidityRemoved: PumpSwapLiquidityRemoved }
  | { RaydiumClmmSwap: RaydiumClmmSwapEvent }
  | { RaydiumClmmIncreaseLiquidity: RaydiumClmmIncreaseLiquidityEvent }
  | { RaydiumClmmDecreaseLiquidity: RaydiumClmmDecreaseLiquidityEvent }
  | { RaydiumClmmCreatePool: RaydiumClmmCreatePoolEvent }
  | { RaydiumClmmOpenPosition: RaydiumClmmOpenPositionEvent }
  | { RaydiumClmmOpenPositionWithTokenExtNft: RaydiumClmmOpenPositionWithTokenExtNftEvent }
  | { RaydiumClmmClosePosition: RaydiumClmmClosePositionEvent }
  | { RaydiumClmmCollectFee: RaydiumClmmCollectFeeEvent }
  | { RaydiumClmmLiquidityChange: RaydiumClmmLiquidityChangeEvent }
  | { RaydiumClmmConfigChange: RaydiumClmmConfigChangeEvent }
  | { RaydiumClmmCreatePersonalPosition: RaydiumClmmCreatePersonalPositionEvent }
  | { RaydiumClmmLiquidityCalculate: RaydiumClmmLiquidityCalculateEvent }
  | { RaydiumClmmOpenLimitOrder: RaydiumClmmOpenLimitOrderEvent }
  | { RaydiumClmmIncreaseLimitOrder: RaydiumClmmIncreaseLimitOrderEvent }
  | { RaydiumClmmDecreaseLimitOrder: RaydiumClmmDecreaseLimitOrderEvent }
  | { RaydiumClmmSettleLimitOrder: RaydiumClmmSettleLimitOrderEvent }
  | { RaydiumClmmUpdateRewardInfos: RaydiumClmmUpdateRewardInfosEvent }
  | { RaydiumCpmmSwap: RaydiumCpmmSwapEvent }
  | { RaydiumCpmmDeposit: RaydiumCpmmDepositEvent }
  | { RaydiumCpmmWithdraw: RaydiumCpmmWithdrawEvent }
  | { RaydiumCpmmInitialize: RaydiumCpmmInitializeEvent }
  | { RaydiumAmmV4Swap: RaydiumAmmV4SwapEvent }
  | { RaydiumAmmV4Deposit: RaydiumAmmV4DepositEvent }
  | { RaydiumAmmV4Withdraw: RaydiumAmmV4WithdrawEvent }
  | { RaydiumAmmV4WithdrawPnl: RaydiumAmmV4WithdrawPnlEvent }
  | { RaydiumAmmV4Initialize2: RaydiumAmmV4Initialize2Event }
  | { OrcaWhirlpoolSwap: OrcaWhirlpoolSwapEvent }
  | { OrcaWhirlpoolLiquidityIncreased: OrcaWhirlpoolLiquidityIncreasedEvent }
  | { OrcaWhirlpoolLiquidityDecreased: OrcaWhirlpoolLiquidityDecreasedEvent }
  | { OrcaWhirlpoolPoolInitialized: OrcaWhirlpoolPoolInitializedEvent }
  | { MeteoraPoolsSwap: MeteoraPoolsSwapEvent }
  | { MeteoraPoolsAddLiquidity: MeteoraPoolsAddLiquidityEvent }
  | { MeteoraPoolsRemoveLiquidity: MeteoraPoolsRemoveLiquidityEvent }
  | { MeteoraPoolsBootstrapLiquidity: MeteoraPoolsBootstrapLiquidityEvent }
  | { MeteoraPoolsPoolCreated: MeteoraPoolsPoolCreatedEvent }
  | { MeteoraPoolsSetPoolFees: MeteoraPoolsSetPoolFeesEvent }
  | { MeteoraDammV2Swap: MeteoraDammV2SwapEvent }
  | { MeteoraDammV2AddLiquidity: MeteoraDammV2AddLiquidityEvent }
  | { MeteoraDammV2RemoveLiquidity: MeteoraDammV2RemoveLiquidityEvent }
  | { MeteoraDammV2CreatePosition: MeteoraDammV2CreatePositionEvent }
  | { MeteoraDammV2InitializePool: MeteoraDammV2InitializePoolEvent }
  | { MeteoraDammV2ClosePosition: MeteoraDammV2ClosePositionEvent }
  | { MeteoraDbcSwap: MeteoraDbcSwapEvent }
  | { MeteoraDbcInitializePool: MeteoraDbcInitializePoolEvent }
  | { MeteoraDbcCurveComplete: MeteoraDbcCurveCompleteEvent }
  | { MeteoraDlmmSwap: MeteoraDlmmSwapEvent }
  | { MeteoraDlmmAddLiquidity: MeteoraDlmmAddLiquidityEvent }
  | { MeteoraDlmmRemoveLiquidity: MeteoraDlmmRemoveLiquidityEvent }
  | { MeteoraDlmmInitializePool: MeteoraDlmmInitializePoolEvent }
  | { MeteoraDlmmInitializeBinArray: MeteoraDlmmInitializeBinArrayEvent }
  | { MeteoraDlmmCreatePosition: MeteoraDlmmCreatePositionEvent }
  | { MeteoraDlmmClosePosition: MeteoraDlmmClosePositionEvent }
  | { MeteoraDlmmClaimFee: MeteoraDlmmClaimFeeEvent }
  | { RaydiumLaunchlabTrade: RaydiumLaunchlabTradeEvent }
  | { RaydiumLaunchlabPoolCreate: RaydiumLaunchlabPoolCreateEvent }
  | { RaydiumLaunchlabMigrateAmm: RaydiumLaunchlabMigrateAmmEvent }
  | { TokenInfo: TokenInfoEvent }
  | { TokenAccount: TokenAccountEvent }
  | { NonceAccount: NonceAccountEvent }
  | { PumpFunGlobalAccount: PumpFunGlobalAccountEvent }
  | { PumpFunBondingCurveAccount: PumpFunBondingCurveAccountEvent }
  | { PumpFunFeeConfigAccount: PumpFunFeeConfigAccountEvent }
  | { PumpFunSharingConfigAccount: PumpFunSharingConfigAccountEvent }
  | { PumpFunGlobalVolumeAccumulatorAccount: PumpFunGlobalVolumeAccumulatorAccountEvent }
  | { PumpFunUserVolumeAccumulatorAccount: PumpFunUserVolumeAccumulatorAccountEvent }
  | { PumpSwapGlobalConfigAccount: PumpSwapGlobalConfigAccountEvent }
  | { PumpSwapPoolAccount: PumpSwapPoolAccountEvent }
  | { RaydiumClmmAmmConfigAccount: RaydiumClmmAmmConfigAccountEvent }
  | { RaydiumClmmPoolStateAccount: RaydiumClmmPoolStateAccountEvent }
  | { RaydiumClmmTickArrayStateAccount: RaydiumClmmTickArrayStateAccountEvent }
  | { RaydiumCpmmAmmConfigAccount: RaydiumCpmmAmmConfigAccountEvent }
  | { RaydiumCpmmPoolStateAccount: RaydiumCpmmPoolStateAccountEvent }
  | { OrcaWhirlpoolAccount: OrcaWhirlpoolAccountEvent }
  | { OrcaPositionAccount: OrcaPositionAccountEvent }
  | { OrcaTickArrayAccount: OrcaTickArrayAccountEvent }
  | { OrcaFeeTierAccount: OrcaFeeTierAccountEvent }
  | { OrcaWhirlpoolsConfigAccount: OrcaWhirlpoolsConfigAccountEvent }
  | { BlockMeta: BlockMetaEvent }
  | { Error: string };

export interface PumpFunCreateTokenEvent {
  metadata: EventMetadata;
  name: string;
  symbol: string;
  uri: string;
  mint: string;
  bonding_curve: string;
  user: string;
  creator: string;
  timestamp: bigint;
  virtual_token_reserves: bigint;
  virtual_sol_reserves: bigint;
  real_token_reserves: bigint;
  token_total_supply: bigint;
  token_program: string;
  is_mayhem_mode: boolean;
  is_cashback_enabled: boolean;
  quote_mint: string;
  quote_vault: string;
  quote_token_program: string;
  virtual_quote_reserves: bigint;
  ix_name: string;
}

export interface PumpFunCreateV2TokenEvent extends PumpFunCreateTokenEvent {
  mint_authority: string;
  associated_bonding_curve: string;
  global: string;
  system_program: string;
  associated_token_program: string;
  mayhem_program_id: string;
  global_params: string;
  sol_vault: string;
  mayhem_state: string;
  mayhem_token_vault: string;
  event_authority: string;
  program: string;
  observed_fee_recipient: string;
}

export interface PumpFunTradeEvent {
  metadata: EventMetadata;
  mint: string;
  sol_amount: bigint;
  token_amount: bigint;
  is_buy: boolean;
  is_created_buy: boolean;
  user: string;
  timestamp: bigint;
  virtual_sol_reserves: bigint;
  virtual_token_reserves: bigint;
  real_sol_reserves: bigint;
  real_token_reserves: bigint;
  fee_recipient: string;
  fee_basis_points: bigint;
  fee: bigint;
  creator: string;
  creator_fee_basis_points: bigint;
  creator_fee: bigint;
  track_volume: boolean;
  total_unclaimed_tokens: bigint;
  total_claimed_tokens: bigint;
  current_sol_volume: bigint;
  last_update_timestamp: bigint;
  ix_name: string;
  mayhem_mode: boolean;
  cashback_fee_basis_points: bigint;
  cashback: bigint;
  buyback_fee_basis_points?: bigint;
  buyback_fee?: bigint;
  shareholders?: PumpFeesShareholder[];
  quote_mint?: string;
  quote_amount?: bigint;
  virtual_quote_reserves?: bigint;
  real_quote_reserves?: bigint;
  is_cashback_coin: boolean;
  amount?: bigint;
  max_sol_cost?: bigint;
  min_sol_output?: bigint;
  spendable_sol_in?: bigint;
  spendable_quote_in?: bigint;
  min_tokens_out?: bigint;
  global?: string;
  bonding_curve: string;
  bonding_curve_v2?: string;
  associated_bonding_curve: string;
  associated_user?: string;
  system_program?: string;
  token_program: string;
  quote_token_program?: string;
  associated_token_program?: string;
  creator_vault: string;
  associated_quote_fee_recipient?: string;
  buyback_fee_recipient?: string;
  associated_quote_buyback_fee_recipient?: string;
  associated_quote_bonding_curve?: string;
  associated_quote_user?: string;
  associated_creator_vault?: string;
  sharing_config?: string;
  event_authority?: string;
  program?: string;
  global_volume_accumulator?: string;
  user_volume_accumulator?: string;
  associated_user_volume_accumulator?: string;
  fee_config?: string;
  fee_program?: string;
  account?: string;
}

export interface PumpFunMigrateEvent {
  metadata: EventMetadata;
  user: string;
  mint: string;
  mint_amount: bigint;
  sol_amount: bigint;
  pool_migration_fee: bigint;
  bonding_curve: string;
  timestamp: bigint;
  pool: string;
}

export interface PumpFeesShareholder {
  address: string;
  share_bps: number;
}

export type PumpFeesConfigStatus = "Paused" | "Active";

export interface PumpFeesFees {
  lp_fee_bps: bigint;
  protocol_fee_bps: bigint;
  creator_fee_bps: bigint;
}

export interface PumpFeesFeeTier {
  market_cap_lamports_threshold: bigint;
  fees: PumpFeesFees;
}

export interface PumpFeesCreateFeeSharingConfigEvent {
  metadata: EventMetadata;
  timestamp: bigint;
  mint: string;
  bonding_curve: string;
  pool?: string;
  sharing_config: string;
  admin: string;
  initial_shareholders: PumpFeesShareholder[];
  status: PumpFeesConfigStatus;
}

export interface PumpFeesInitializeFeeConfigEvent {
  metadata: EventMetadata;
  timestamp: bigint;
  admin: string;
  fee_config: string;
}

export interface PumpFeesResetFeeSharingConfigEvent {
  metadata: EventMetadata;
  timestamp: bigint;
  mint: string;
  sharing_config: string;
  old_admin: string;
  old_shareholders: PumpFeesShareholder[];
  new_admin: string;
  new_shareholders: PumpFeesShareholder[];
}

export interface PumpFeesRevokeFeeSharingAuthorityEvent {
  metadata: EventMetadata;
  timestamp: bigint;
  mint: string;
  sharing_config: string;
  admin: string;
}

export interface PumpFeesTransferFeeSharingAuthorityEvent {
  metadata: EventMetadata;
  timestamp: bigint;
  mint: string;
  sharing_config: string;
  old_admin: string;
  new_admin: string;
}

export interface PumpFeesUpdateAdminEvent {
  metadata: EventMetadata;
  timestamp: bigint;
  old_admin: string;
  new_admin: string;
}

export interface PumpFeesUpdateFeeConfigEvent {
  metadata: EventMetadata;
  timestamp: bigint;
  admin: string;
  fee_config: string;
  fee_tiers: PumpFeesFeeTier[];
  flat_fees: PumpFeesFees;
}

export interface PumpFeesUpdateFeeSharesEvent {
  metadata: EventMetadata;
  timestamp: bigint;
  mint: string;
  sharing_config: string;
  admin: string;
  bonding_curve: string;
  pump_creator_vault: string;
  new_shareholders: PumpFeesShareholder[];
}

export interface PumpFeesUpsertFeeTiersEvent {
  metadata: EventMetadata;
  timestamp: bigint;
  admin: string;
  fee_config: string;
  fee_tiers: PumpFeesFeeTier[];
  offset: number;
}

export interface PumpFunMigrateBondingCurveCreatorEvent {
  metadata: EventMetadata;
  timestamp: bigint;
  mint: string;
  bonding_curve: string;
  sharing_config: string;
  old_creator: string;
  new_creator: string;
}

/** 与 `PumpSwapTradeEvent`（IDL TradeEvent）对齐 */
export interface PumpSwapTradeEvent {
  metadata: EventMetadata;
  mint: string;
  sol_amount: bigint;
  token_amount: bigint;
  is_buy: boolean;
  user: string;
  timestamp: bigint;
  virtual_sol_reserves: bigint;
  virtual_token_reserves: bigint;
  real_sol_reserves: bigint;
  real_token_reserves: bigint;
  fee_recipient: string;
  fee_basis_points: bigint;
  fee: bigint;
  creator: string;
  creator_fee_basis_points: bigint;
  creator_fee: bigint;
  track_volume: boolean;
  total_unclaimed_tokens: bigint;
  total_claimed_tokens: bigint;
  current_sol_volume: bigint;
  last_update_timestamp: bigint;
  ix_name: string;
}

export interface PumpSwapBuyEvent {
  metadata: EventMetadata;
  timestamp: bigint;
  base_amount_out: bigint;
  max_quote_amount_in: bigint;
  user_base_token_reserves: bigint;
  user_quote_token_reserves: bigint;
  pool_base_token_reserves: bigint;
  pool_quote_token_reserves: bigint;
  quote_amount_in: bigint;
  lp_fee_basis_points: bigint;
  lp_fee: bigint;
  protocol_fee_basis_points: bigint;
  protocol_fee: bigint;
  quote_amount_in_with_lp_fee: bigint;
  user_quote_amount_in: bigint;
  pool: string;
  user: string;
  user_base_token_account: string;
  user_quote_token_account: string;
  protocol_fee_recipient: string;
  protocol_fee_recipient_token_account: string;
  coin_creator: string;
  coin_creator_fee_basis_points: bigint;
  coin_creator_fee: bigint;
  track_volume: boolean;
  total_unclaimed_tokens: bigint;
  total_claimed_tokens: bigint;
  current_sol_volume: bigint;
  last_update_timestamp: bigint;
  min_base_amount_out: bigint;
  ix_name: string;
  /** 与 `PumpSwapBuyEvent`：PUMP_CASHBACK / IDL */
  cashback_fee_basis_points: bigint;
  cashback: bigint;
  /** 由 fees 指令数据填充（见 `fillDataRpc`） */
  is_pump_pool: boolean;
  /** 自指令账户填充（account_fillers/pumpswap） */
  base_mint: string;
  quote_mint: string;
  pool_base_token_account: string;
  pool_quote_token_account: string;
  coin_creator_vault_ata: string;
  coin_creator_vault_authority: string;
  base_token_program: string;
  quote_token_program: string;
  pool_v2?: string;
  fee_recipient?: string;
  fee_recipient_quote_token_account?: string;
}

export interface PumpSwapSellEvent {
  metadata: EventMetadata;
  timestamp: bigint;
  base_amount_in: bigint;
  min_quote_amount_out: bigint;
  user_base_token_reserves: bigint;
  user_quote_token_reserves: bigint;
  pool_base_token_reserves: bigint;
  pool_quote_token_reserves: bigint;
  quote_amount_out: bigint;
  lp_fee_basis_points: bigint;
  lp_fee: bigint;
  protocol_fee_basis_points: bigint;
  protocol_fee: bigint;
  quote_amount_out_without_lp_fee: bigint;
  user_quote_amount_out: bigint;
  pool: string;
  user: string;
  user_base_token_account: string;
  user_quote_token_account: string;
  protocol_fee_recipient: string;
  protocol_fee_recipient_token_account: string;
  coin_creator: string;
  coin_creator_fee_basis_points: bigint;
  coin_creator_fee: bigint;
  cashback_fee_basis_points: bigint;
  cashback: bigint;
  is_pump_pool: boolean;
  base_mint: string;
  quote_mint: string;
  pool_base_token_account: string;
  pool_quote_token_account: string;
  coin_creator_vault_ata: string;
  coin_creator_vault_authority: string;
  base_token_program: string;
  quote_token_program: string;
  pool_v2?: string;
  fee_recipient?: string;
  fee_recipient_quote_token_account?: string;
}

export interface PumpSwapCreatePoolEvent {
  metadata: EventMetadata;
  timestamp: bigint;
  index: number;
  creator: string;
  base_mint: string;
  quote_mint: string;
  base_mint_decimals: number;
  quote_mint_decimals: number;
  base_amount_in: bigint;
  quote_amount_in: bigint;
  pool_base_amount: bigint;
  pool_quote_amount: bigint;
  minimum_liquidity: bigint;
  initial_liquidity: bigint;
  lp_token_amount_out: bigint;
  pool_bump: number;
  pool: string;
  lp_mint: string;
  user_base_token_account: string;
  user_quote_token_account: string;
  coin_creator: string;
  is_mayhem_mode: boolean;
}

export interface PumpSwapLiquidityAdded {
  metadata: EventMetadata;
  timestamp: bigint;
  lp_token_amount_out: bigint;
  max_base_amount_in: bigint;
  max_quote_amount_in: bigint;
  user_base_token_reserves: bigint;
  user_quote_token_reserves: bigint;
  pool_base_token_reserves: bigint;
  pool_quote_token_reserves: bigint;
  base_amount_in: bigint;
  quote_amount_in: bigint;
  lp_mint_supply: bigint;
  pool: string;
  user: string;
  user_base_token_account: string;
  user_quote_token_account: string;
  user_pool_token_account: string;
}

export interface PumpSwapLiquidityRemoved {
  metadata: EventMetadata;
  timestamp: bigint;
  lp_token_amount_in: bigint;
  min_base_amount_out: bigint;
  min_quote_amount_out: bigint;
  user_base_token_reserves: bigint;
  user_quote_token_reserves: bigint;
  pool_base_token_reserves: bigint;
  pool_quote_token_reserves: bigint;
  base_amount_out: bigint;
  quote_amount_out: bigint;
  lp_mint_supply: bigint;
  pool: string;
  user: string;
  user_base_token_account: string;
  user_quote_token_account: string;
  user_pool_token_account: string;
}

/**
 * Raydium CLMM Swap（Program data 子集）。
 * `sqrt_price_x64` 对应链上载荷中的 sqrt price limit u128。
 * TS 为 `bigint`；Go/Python 落 JSON 时为十进制字符串；占位 `liquidity` 为 `0n` / `"0"`。
 */
export interface RaydiumClmmSwapEvent {
  metadata: EventMetadata;
  pool_state: string;
  token_account_0: string;
  token_account_1: string;
  amount_0: bigint;
  amount_1: bigint;
  zero_for_one: boolean;
  sqrt_price_x64: bigint;
  liquidity: bigint;
  sender: string;
  transfer_fee_0: bigint;
  transfer_fee_1: bigint;
  tick: number;
}

/** `liquidity` 在 Go/Python 为十进制字符串。 */
export interface RaydiumClmmIncreaseLiquidityEvent {
  metadata: EventMetadata;
  pool: string;
  position_nft_mint: string;
  user: string;
  liquidity: bigint;
  amount_0: bigint;
  amount_1: bigint;
  amount_0_transfer_fee: bigint;
  amount_1_transfer_fee: bigint;
  amount0_max: bigint;
  amount1_max: bigint;
}

/** `liquidity` 在 Go/Python 为十进制字符串。 */
export interface RaydiumClmmDecreaseLiquidityEvent {
  metadata: EventMetadata;
  pool: string;
  position_nft_mint: string;
  user: string;
  liquidity: bigint;
  decrease_amount_0: bigint;
  decrease_amount_1: bigint;
  fee_amount_0: bigint;
  fee_amount_1: bigint;
  reward_amounts: [bigint, bigint, bigint];
  transfer_fee_0: bigint;
  transfer_fee_1: bigint;
  amount0_min: bigint;
  amount1_min: bigint;
}

/** `sqrt_price_x64` 在 Go/Python 为十进制字符串。 */
export interface RaydiumClmmCreatePoolEvent {
  metadata: EventMetadata;
  pool: string;
  token_0_mint: string;
  token_1_mint: string;
  tick_spacing: number;
  fee_rate: number;
  creator: string;
  sqrt_price_x64: bigint;
  tick: number;
  token_vault_0: string;
  token_vault_1: string;
  open_time: bigint;
}

/** 与 `RaydiumClmmOpenPositionEvent` 对齐 */
export interface RaydiumClmmOpenPositionEvent {
  metadata: EventMetadata;
  pool: string;
  user: string;
  position_nft_mint: string;
  tick_lower_index: number;
  tick_upper_index: number;
  liquidity: bigint;
}

/** 与 `RaydiumClmmOpenPositionWithTokenExtNftEvent` 对齐 */
export interface RaydiumClmmOpenPositionWithTokenExtNftEvent {
  metadata: EventMetadata;
  pool: string;
  user: string;
  position_nft_mint: string;
  tick_lower_index: number;
  tick_upper_index: number;
  liquidity: bigint;
}

/** 与 `RaydiumClmmClosePositionEvent` 对齐 */
export interface RaydiumClmmClosePositionEvent {
  metadata: EventMetadata;
  pool: string;
  user: string;
  position_nft_mint: string;
}

export interface RaydiumClmmCollectFeeEvent {
  metadata: EventMetadata;
  pool_state: string;
  position_nft_mint: string;
  recipient_token_account_0: string;
  recipient_token_account_1: string;
  amount_0: bigint;
  amount_1: bigint;
}

export interface RaydiumClmmLiquidityChangeEvent {
  metadata: EventMetadata;
  pool_state: string;
  tick: number;
  tick_lower: number;
  tick_upper: number;
  liquidity_before: bigint;
  liquidity_after: bigint;
}

export interface RaydiumClmmConfigChangeEvent {
  metadata: EventMetadata;
  index: number;
  owner: string;
  protocol_fee_rate: number;
  trade_fee_rate: number;
  tick_spacing: number;
  fund_fee_rate: number;
  fund_owner: string;
}

export interface RaydiumClmmCreatePersonalPositionEvent {
  metadata: EventMetadata;
  pool_state: string;
  minter: string;
  nft_owner: string;
  tick_lower_index: number;
  tick_upper_index: number;
  liquidity: bigint;
  deposit_amount_0: bigint;
  deposit_amount_1: bigint;
  deposit_amount_0_transfer_fee: bigint;
  deposit_amount_1_transfer_fee: bigint;
}

export interface RaydiumClmmLiquidityCalculateEvent {
  metadata: EventMetadata;
  pool_liquidity: bigint;
  pool_sqrt_price_x64: bigint;
  pool_tick: number;
  calc_amount_0: bigint;
  calc_amount_1: bigint;
  trade_fee_owed_0: bigint;
  trade_fee_owed_1: bigint;
  transfer_fee_0: bigint;
  transfer_fee_1: bigint;
}

export interface RaydiumClmmOpenLimitOrderEvent {
  metadata: EventMetadata;
  pool_id: string;
  limit_order: string;
  zero_for_one: boolean;
  tick_index: number;
  total_amount: bigint;
  transfer_fee: bigint;
}

export interface RaydiumClmmIncreaseLimitOrderEvent {
  metadata: EventMetadata;
  pool_id: string;
  limit_order: string;
  zero_for_one: boolean;
  tick_index: number;
  total_amount: bigint;
  increased_amount: bigint;
  transfer_fee: bigint;
}

export interface RaydiumClmmDecreaseLimitOrderEvent {
  metadata: EventMetadata;
  pool_id: string;
  limit_order: string;
  zero_for_one: boolean;
  tick_index: number;
  total_amount: bigint;
  filled_amount: bigint;
  settled_output_amount: bigint;
  decreased_amount: bigint;
}

export interface RaydiumClmmSettleLimitOrderEvent {
  metadata: EventMetadata;
  pool_id: string;
  limit_order: string;
  zero_for_one: boolean;
  tick_index: number;
  total_amount: bigint;
  filled_amount: bigint;
  settled_amount_out: bigint;
}

export interface RaydiumClmmUpdateRewardInfosEvent {
  metadata: EventMetadata;
  reward_growth_global_x64: [bigint, bigint, bigint];
}

export interface RaydiumCpmmSwapEvent {
  metadata: EventMetadata;
  pool_id: string;
  input_vault_before: bigint;
  output_vault_before: bigint;
  input_amount: bigint;
  output_amount: bigint;
  input_transfer_fee: bigint;
  output_transfer_fee: bigint;
  base_input: boolean;
}

export interface RaydiumCpmmDepositEvent {
  metadata: EventMetadata;
  pool: string;
  user: string;
  lp_token_amount: bigint;
  token0_amount: bigint;
  token1_amount: bigint;
}

export interface RaydiumCpmmWithdrawEvent {
  metadata: EventMetadata;
  pool: string;
  user: string;
  lp_token_amount: bigint;
  token0_amount: bigint;
  token1_amount: bigint;
}

export interface RaydiumCpmmInitializeEvent {
  metadata: EventMetadata;
  pool: string;
  creator: string;
  init_amount0: bigint;
  init_amount1: bigint;
}

export interface RaydiumAmmV4SwapEvent {
  metadata: EventMetadata;
  amount_in: bigint;
  minimum_amount_out: bigint;
  max_amount_in: bigint;
  amount_out: bigint;
  token_program: string;
  amm: string;
  amm_authority: string;
  amm_open_orders: string;
  amm_target_orders?: string;
  pool_coin_token_account: string;
  pool_pc_token_account: string;
  serum_program: string;
  serum_market: string;
  serum_bids: string;
  serum_asks: string;
  serum_event_queue: string;
  serum_coin_vault_account: string;
  serum_pc_vault_account: string;
  serum_vault_signer: string;
  user_source_token_account: string;
  user_destination_token_account: string;
  user_source_owner: string;
}

export interface RaydiumAmmV4DepositEvent {
  metadata: EventMetadata;
  max_coin_amount: bigint;
  max_pc_amount: bigint;
  base_side: bigint;
  token_program: string;
  amm: string;
  amm_authority: string;
  amm_open_orders: string;
  amm_target_orders: string;
  lp_mint_address: string;
  pool_coin_token_account: string;
  pool_pc_token_account: string;
  serum_market: string;
  user_coin_token_account: string;
  user_pc_token_account: string;
  user_lp_token_account: string;
  user_owner: string;
  serum_event_queue: string;
}

export interface RaydiumAmmV4WithdrawEvent {
  metadata: EventMetadata;
  amount: bigint;
  token_program: string;
  amm: string;
  amm_authority: string;
  amm_open_orders: string;
  amm_target_orders: string;
  lp_mint_address: string;
  pool_coin_token_account: string;
  pool_pc_token_account: string;
  pool_withdraw_queue: string;
  pool_temp_lp_token_account: string;
  serum_program: string;
  serum_market: string;
  serum_coin_vault_account: string;
  serum_pc_vault_account: string;
  serum_vault_signer: string;
  user_lp_token_account: string;
  user_coin_token_account: string;
  user_pc_token_account: string;
  user_owner: string;
  serum_event_queue: string;
  serum_bids: string;
  serum_asks: string;
}

/** 与 `RaydiumAmmV4WithdrawPnlEvent` 对齐 */
export interface RaydiumAmmV4WithdrawPnlEvent {
  metadata: EventMetadata;
  token_program: string;
  amm: string;
  amm_config: string;
  amm_authority: string;
  amm_open_orders: string;
  pool_coin_token_account: string;
  pool_pc_token_account: string;
  coin_pnl_token_account: string;
  pc_pnl_token_account: string;
  pnl_owner: string;
  amm_target_orders: string;
  serum_program: string;
  serum_market: string;
  serum_event_queue: string;
  serum_coin_vault_account: string;
  serum_pc_vault_account: string;
  serum_vault_signer: string;
}

/** 与 `RaydiumAmmV4Initialize2Event` 对齐 */
export interface RaydiumAmmV4Initialize2Event {
  metadata: EventMetadata;
  nonce: number;
  open_time: bigint;
  init_pc_amount: bigint;
  init_coin_amount: bigint;
  token_program: string;
  spl_associated_token_account: string;
  system_program: string;
  rent: string;
  amm: string;
  amm_authority: string;
  amm_open_orders: string;
  lp_mint: string;
  coin_mint: string;
  pc_mint: string;
  pool_coin_token_account: string;
  pool_pc_token_account: string;
  pool_withdraw_queue: string;
  amm_target_orders: string;
  pool_temp_lp: string;
  serum_program: string;
  serum_market: string;
  user_wallet: string;
  user_token_coin: string;
  user_token_pc: string;
  user_lp_token_account: string;
}

/** Orca Whirlpool：u128 语义字段在 TS 为 `bigint`；Go/Python 为十进制字符串。 */
export interface OrcaWhirlpoolSwapEvent {
  metadata: EventMetadata;
  whirlpool: string;
  a_to_b: boolean;
  pre_sqrt_price: bigint;
  post_sqrt_price: bigint;
  input_amount: bigint;
  output_amount: bigint;
  input_transfer_fee: bigint;
  output_transfer_fee: bigint;
  lp_fee: bigint;
  protocol_fee: bigint;
}

/** `liquidity` 在 Go/Python 为十进制字符串。 */
export interface OrcaWhirlpoolLiquidityIncreasedEvent {
  metadata: EventMetadata;
  whirlpool: string;
  position: string;
  tick_lower_index: number;
  tick_upper_index: number;
  liquidity: bigint;
  token_a_amount: bigint;
  token_b_amount: bigint;
  token_a_transfer_fee: bigint;
  token_b_transfer_fee: bigint;
}

/** `liquidity` 在 Go/Python 为十进制字符串。 */
export interface OrcaWhirlpoolLiquidityDecreasedEvent {
  metadata: EventMetadata;
  whirlpool: string;
  position: string;
  tick_lower_index: number;
  tick_upper_index: number;
  liquidity: bigint;
  token_a_amount: bigint;
  token_b_amount: bigint;
  token_a_transfer_fee: bigint;
  token_b_transfer_fee: bigint;
}

/** `initial_sqrt_price` 在 Go/Python 为十进制字符串。 */
export interface OrcaWhirlpoolPoolInitializedEvent {
  metadata: EventMetadata;
  whirlpool: string;
  whirlpools_config: string;
  token_mint_a: string;
  token_mint_b: string;
  tick_spacing: number;
  token_program_a: string;
  token_program_b: string;
  decimals_a: number;
  decimals_b: number;
  initial_sqrt_price: bigint;
}

export interface MeteoraPoolsSwapEvent {
  metadata: EventMetadata;
  in_amount: bigint;
  out_amount: bigint;
  trade_fee: bigint;
  admin_fee: bigint;
  host_fee: bigint;
}

export interface MeteoraPoolsAddLiquidityEvent {
  metadata: EventMetadata;
  lp_mint_amount: bigint;
  token_a_amount: bigint;
  token_b_amount: bigint;
}

export interface MeteoraPoolsRemoveLiquidityEvent {
  metadata: EventMetadata;
  lp_unmint_amount: bigint;
  token_a_out_amount: bigint;
  token_b_out_amount: bigint;
}

export interface MeteoraPoolsBootstrapLiquidityEvent {
  metadata: EventMetadata;
  lp_mint_amount: bigint;
  token_a_amount: bigint;
  token_b_amount: bigint;
  pool: string;
}

export interface MeteoraPoolsPoolCreatedEvent {
  metadata: EventMetadata;
  lp_mint: string;
  token_a_mint: string;
  token_b_mint: string;
  pool_type: number;
  pool: string;
}

/**
 * Meteora DAMM v2 Swap。TS 内 u128 语义字段为 `bigint`；
 * Go `DexEvent` / Python 解析结果中 `next_sqrt_price` 等为**十进制字符串**（与 `bigint` 十进制一致）。
 */
export interface MeteoraDammV2SwapEvent {
  metadata: EventMetadata;
  pool: string;
  amount_in: bigint;
  output_amount: bigint;
  trade_direction: number;
  has_referral: boolean;
  minimum_amount_out: bigint;
  next_sqrt_price: bigint;
  lp_fee: bigint;
  protocol_fee: bigint;
  partner_fee: bigint;
  referral_fee: bigint;
  actual_amount_in: bigint;
  current_timestamp: bigint;
  token_a_vault: string;
  token_b_vault: string;
  token_a_mint: string;
  token_b_mint: string;
  token_a_program: string;
  token_b_program: string;
}

/** 与 `MeteoraDammV2AddLiquidityEvent` 对齐；Go/Python 中 `liquidity_delta` 为十进制字符串。 */
export interface MeteoraDammV2AddLiquidityEvent {
  metadata: EventMetadata;
  pool: string;
  position: string;
  owner: string;
  token_a_amount: bigint;
  token_b_amount: bigint;
  liquidity_delta: bigint;
  token_a_amount_threshold: bigint;
  token_b_amount_threshold: bigint;
  total_amount_a: bigint;
  total_amount_b: bigint;
}

/** 与 `MeteoraDammV2RemoveLiquidityEvent` 对齐；Go/Python 中 `liquidity_delta` 为十进制字符串。 */
export interface MeteoraDammV2RemoveLiquidityEvent {
  metadata: EventMetadata;
  pool: string;
  position: string;
  owner: string;
  token_a_amount: bigint;
  token_b_amount: bigint;
  liquidity_delta: bigint;
  token_a_amount_threshold: bigint;
  token_b_amount_threshold: bigint;
}

/** 与 `MeteoraDammV2CreatePositionEvent` 对齐 */
export interface MeteoraDammV2CreatePositionEvent {
  metadata: EventMetadata;
  pool: string;
  owner: string;
  position: string;
  position_nft_mint: string;
}

export interface MeteoraDammV2InitializePoolEvent {
  metadata: EventMetadata;
  pool: string;
  token_a_mint: string;
  token_b_mint: string;
  creator: string;
  payer: string;
  alpha_vault: string;
  pool_fees: unknown;
  sqrt_min_price: bigint;
  sqrt_max_price: bigint;
  activation_type: number;
  collect_fee_mode: number;
  liquidity: bigint;
  sqrt_price: bigint;
  activation_point: bigint;
  token_a_flag: number;
  token_b_flag: number;
  token_a_amount: bigint;
  token_b_amount: bigint;
  total_amount_a: bigint;
  total_amount_b: bigint;
  pool_type: number;
  position?: string;
  position_nft_mint?: string;
}

/** 与 `MeteoraDammV2ClosePositionEvent` 对齐 */
export interface MeteoraDammV2ClosePositionEvent {
  metadata: EventMetadata;
  pool: string;
  owner: string;
  position: string;
  position_nft_mint: string;
}

export interface MeteoraDbcSwapEvent {
  metadata: EventMetadata;
  pool: string;
  config: string;
  trade_direction: number;
  has_referral: boolean;
  amount_in: bigint;
  minimum_amount_out: bigint;
  actual_input_amount: bigint;
  output_amount: bigint;
  next_sqrt_price: bigint;
  trading_fee: bigint;
  protocol_fee: bigint;
  referral_fee: bigint;
  current_timestamp: bigint;
}

export interface MeteoraDbcInitializePoolEvent {
  metadata: EventMetadata;
  pool: string;
  config: string;
  creator: string;
  base_mint: string;
  pool_type: number;
  activation_point: bigint;
}

export interface MeteoraDbcCurveCompleteEvent {
  metadata: EventMetadata;
  pool: string;
  config: string;
  base_reserve: bigint;
  quote_reserve: bigint;
}

/** Meteora DLMM Swap：`fee_bps` 在 Go/Python 为十进制字符串。 */
export interface MeteoraDlmmSwapEvent {
  metadata: EventMetadata;
  pool: string;
  from: string;
  start_bin_id: number;
  end_bin_id: number;
  amount_in: bigint;
  amount_out: bigint;
  swap_for_y: boolean;
  fee: bigint;
  protocol_fee: bigint;
  fee_bps: bigint;
  host_fee: bigint;
}

export interface MeteoraPoolsSetPoolFeesEvent {
  metadata: EventMetadata;
  trade_fee_numerator: bigint;
  trade_fee_denominator: bigint;
  owner_trade_fee_numerator: bigint;
  owner_trade_fee_denominator: bigint;
  pool: string;
}

export interface MeteoraDlmmAddLiquidityEvent {
  metadata: EventMetadata;
  pool: string;
  from: string;
  position: string;
  amounts: [bigint, bigint];
  active_bin_id: number;
}

export interface MeteoraDlmmRemoveLiquidityEvent {
  metadata: EventMetadata;
  pool: string;
  from: string;
  position: string;
  amounts: [bigint, bigint];
  active_bin_id: number;
}

export interface MeteoraDlmmInitializePoolEvent {
  metadata: EventMetadata;
  pool: string;
  creator: string;
  active_bin_id: number;
  bin_step: number;
}

export interface MeteoraDlmmInitializeBinArrayEvent {
  metadata: EventMetadata;
  pool: string;
  bin_array: string;
  index: bigint;
}

export interface MeteoraDlmmCreatePositionEvent {
  metadata: EventMetadata;
  pool: string;
  position: string;
  owner: string;
  lower_bin_id: number;
  width: number;
}

export interface MeteoraDlmmClosePositionEvent {
  metadata: EventMetadata;
  pool: string;
  position: string;
  owner: string;
}

export interface MeteoraDlmmClaimFeeEvent {
  metadata: EventMetadata;
  pool: string;
  position: string;
  owner: string;
  fee_x: bigint;
  fee_y: bigint;
}

export type TradeDirection = "Buy" | "Sell";

export interface RaydiumLaunchlabTradeEvent {
  metadata: EventMetadata;
  pool_state: string;
  user: string;
  amount_in: bigint;
  amount_out: bigint;
  is_buy: boolean;
  trade_direction: TradeDirection;
  exact_in: boolean;
}

export interface BaseMintParam {
  symbol: string;
  name: string;
  uri: string;
  decimals: number;
}

export interface RaydiumLaunchlabPoolCreateEvent {
  metadata: EventMetadata;
  base_mint_param: BaseMintParam;
  pool_state: string;
  creator: string;
}

export interface RaydiumLaunchlabMigrateAmmEvent {
  metadata: EventMetadata;
  old_pool: string;
  new_pool: string;
  user: string;
  liquidity_amount: bigint;
}

export interface TokenInfoEvent {
  metadata: EventMetadata;
  pubkey: string;
  executable: boolean;
  lamports: bigint;
  owner: string;
  rent_epoch: bigint;
  supply: bigint;
  decimals: number;
}

export interface TokenAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  executable: boolean;
  lamports: bigint;
  owner: string;
  rent_epoch: bigint;
  amount: bigint | null;
  token_owner: string;
}

export interface NonceAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  executable: boolean;
  lamports: bigint;
  owner: string;
  rent_epoch: bigint;
  nonce: string;
  authority: string;
}

export interface PumpFunGlobal {
  initialized: boolean;
  authority: string;
  fee_recipient: string;
  initial_virtual_token_reserves: bigint;
  initial_virtual_sol_reserves: bigint;
  initial_real_token_reserves: bigint;
  token_total_supply: bigint;
  fee_basis_points: bigint;
  withdraw_authority: string;
  enable_migrate: boolean;
  pool_migration_fee: bigint;
  creator_fee_basis_points: bigint;
  fee_recipients: string[];
  set_creator_authority: string;
  admin_set_creator_authority: string;
  create_v2_enabled: boolean;
  whitelist_pda: string;
  reserved_fee_recipient: string;
  mayhem_mode_enabled: boolean;
  reserved_fee_recipients: string[];
  is_cashback_enabled: boolean;
  buyback_fee_recipients: string[];
  buyback_basis_points: bigint;
  initial_virtual_quote_reserves: bigint;
  whitelisted_quote_mints: string[];
}

export interface PumpFunGlobalAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  global: PumpFunGlobal;
}

export interface PumpFunBondingCurve {
  virtual_token_reserves: bigint;
  virtual_quote_reserves: bigint;
  real_token_reserves: bigint;
  real_quote_reserves: bigint;
  token_total_supply: bigint;
  complete: boolean;
  creator: string;
  is_mayhem_mode: boolean;
  is_cashback_coin: boolean;
  quote_mint: string;
}

export interface PumpFunBondingCurveAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  bonding_curve: PumpFunBondingCurve;
}

export interface PumpFunFeeConfig {
  bump: number;
  admin: string;
  flat_fees: PumpFeesFees;
  fee_tiers: PumpFeesFeeTier[];
  stable_fee_tiers: PumpFeesFeeTier[];
}

export interface PumpFunFeeConfigAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  fee_config: PumpFunFeeConfig;
}

export interface PumpFunSharingConfig {
  bump: number;
  version: number;
  status: PumpFeesConfigStatus;
  mint: string;
  admin: string;
  admin_revoked: boolean;
  shareholders: PumpFeesShareholder[];
}

export interface PumpFunSharingConfigAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  sharing_config: PumpFunSharingConfig;
}

export interface PumpFunGlobalVolumeAccumulator {
  start_time: bigint;
  end_time: bigint;
  seconds_in_a_day: bigint;
  mint: string;
  total_token_supply: bigint[];
  sol_volumes: bigint[];
}

export interface PumpFunGlobalVolumeAccumulatorAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  global_volume_accumulator: PumpFunGlobalVolumeAccumulator;
}

export interface PumpFunUserVolumeAccumulator {
  user: string;
  needs_claim: boolean;
  total_unclaimed_tokens: bigint;
  total_claimed_tokens: bigint;
  current_sol_volume: bigint;
  last_update_timestamp: bigint;
  has_total_claimed_tokens: boolean;
  cashback_earned: bigint;
  total_cashback_claimed: bigint;
  stable_cashback_earned: bigint;
  total_stable_cashback_claimed: bigint;
}

export interface PumpFunUserVolumeAccumulatorAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  user_volume_accumulator: PumpFunUserVolumeAccumulator;
}

export interface PumpSwapGlobalConfig {
  admin: string;
  lp_fee_basis_points: bigint;
  protocol_fee_basis_points: bigint;
  disable_flags: number;
  protocol_fee_recipients: string[];
  coin_creator_fee_basis_points: bigint;
  admin_set_coin_creator_authority: string;
  whitelist_pda: string;
  reserved_fee_recipient: string;
  mayhem_mode_enabled: boolean;
  reserved_fee_recipients: string[];
}

export interface PumpSwapGlobalConfigAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  executable: boolean;
  lamports: bigint;
  owner: string;
  rent_epoch: bigint;
  global_config: PumpSwapGlobalConfig;
}

export interface PumpSwapPool {
  pool_bump: number;
  index: number;
  creator: string;
  base_mint: string;
  quote_mint: string;
  lp_mint: string;
  pool_base_token_account: string;
  pool_quote_token_account: string;
  lp_supply: bigint;
  coin_creator: string;
  is_mayhem_mode: boolean;
  is_cashback_coin: boolean;
}

export interface PumpSwapPoolAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  executable: boolean;
  lamports: bigint;
  owner: string;
  rent_epoch: bigint;
  pool: PumpSwapPool;
}

export interface RaydiumClmmAmmConfigAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  amm_config: RaydiumClmmAmmConfig;
}

export interface RaydiumClmmAmmConfig {
  bump: number;
  index: number;
  owner: string;
  protocol_fee_rate: number;
  trade_fee_rate: number;
  tick_spacing: number;
  fund_fee_rate: number;
  padding_u32: number;
  fund_owner: string;
  padding: bigint[];
}

export interface RaydiumClmmPoolStateAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  pool_state: RaydiumClmmPoolState;
}

export interface RaydiumClmmPoolState {
  bump: [number];
  amm_config: string;
  owner: string;
  token_mint_0: string;
  token_mint_1: string;
  token_vault_0: string;
  token_vault_1: string;
  observation_key: string;
  mint_decimals_0: number;
  mint_decimals_1: number;
  tick_spacing: number;
  liquidity: bigint;
  sqrt_price_x64: bigint;
  tick_current: number;
  padding3: number;
  padding4: number;
  fee_growth_global_0_x64: bigint;
  fee_growth_global_1_x64: bigint;
  protocol_fees_token_0: bigint;
  protocol_fees_token_1: bigint;
  padding5: bigint[];
  status: number;
  fee_on: number;
  padding: number[];
  reward_infos: RaydiumClmmRewardInfo[];
  tick_array_bitmap: bigint[];
  padding6: bigint[];
  fund_fees_token_0: bigint;
  fund_fees_token_1: bigint;
  open_time: bigint;
  recent_epoch: bigint;
  dynamic_fee_info: RaydiumClmmDynamicFeeInfo;
  padding1: bigint[];
  padding2: bigint[];
}

export interface RaydiumClmmRewardInfo {
  reward_state: number;
  open_time: bigint;
  end_time: bigint;
  last_update_time: bigint;
  emissions_per_second_x64: bigint;
  reward_total_emitted: bigint;
  reward_claimed: bigint;
  token_mint: string;
  token_vault: string;
  authority: string;
  reward_growth_global_x64: bigint;
}

export interface RaydiumClmmDynamicFeeInfo {
  filter_period: number;
  decay_period: number;
  reduction_factor: number;
  dynamic_fee_control: number;
  max_volatility_accumulator: number;
  tick_spacing_index_reference: number;
  volatility_reference: number;
  volatility_accumulator: number;
  last_update_timestamp: bigint;
  padding: number[];
}

export interface RaydiumClmmTickArrayStateAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  tick_array_state: RaydiumClmmTickArrayState;
}

export interface RaydiumClmmTickArrayState {
  pool_id: string;
  start_tick_index: number;
  ticks: Tick[];
  initialized_tick_count: number;
  recent_epoch: bigint;
  padding: number[];
}

export interface Tick {
  tick: number;
  liquidity_net: bigint;
  liquidity_gross: bigint;
  fee_growth_outside_0_x64: bigint;
  fee_growth_outside_1_x64: bigint;
  reward_growths_outside_x64: bigint[];
  order_phase: bigint;
  orders_amount: bigint;
  part_filled_orders_remaining: bigint;
  unfilled_ratio_x64: bigint;
  padding: number[];
}

export interface RaydiumCpmmAmmConfigAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  amm_config: RaydiumCpmmAmmConfig;
}

export interface RaydiumCpmmAmmConfig {
  bump: number;
  disable_create_pool: boolean;
  index: number;
  trade_fee_rate: bigint;
  protocol_fee_rate: bigint;
  fund_fee_rate: bigint;
  create_pool_fee: bigint;
  protocol_owner: string;
  fund_owner: string;
  creator_fee_rate: bigint;
  padding: bigint[];
}

export interface RaydiumCpmmPoolStateAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  pool_state: RaydiumCpmmPoolState;
}

export interface RaydiumCpmmPoolState {
  amm_config: string;
  pool_creator: string;
  token_0_vault: string;
  token_1_vault: string;
  lp_mint: string;
  token_0_mint: string;
  token_1_mint: string;
  token_0_program: string;
  token_1_program: string;
  observation_key: string;
  auth_bump: number;
  status: number;
  lp_mint_decimals: number;
  mint_0_decimals: number;
  mint_1_decimals: number;
  lp_supply: bigint;
  protocol_fees_token_0: bigint;
  protocol_fees_token_1: bigint;
  fund_fees_token_0: bigint;
  fund_fees_token_1: bigint;
  open_time: bigint;
  recent_epoch: bigint;
  creator_fee_on: number;
  enable_creator_fee: boolean;
  padding1: number[];
  creator_fees_token_0: bigint;
  creator_fees_token_1: bigint;
  padding: bigint[];
}

export interface OrcaWhirlpoolAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  whirlpool: OrcaWhirlpoolAccount;
}

export interface OrcaWhirlpoolAccount {
  whirlpools_config: string;
  whirlpool_bump: number;
  tick_spacing: number;
  tick_spacing_seed: number[];
  fee_rate: number;
  protocol_fee_rate: number;
  liquidity: bigint;
  sqrt_price: bigint;
  tick_current_index: number;
  protocol_fee_owed_a: bigint;
  protocol_fee_owed_b: bigint;
  token_mint_a: string;
  token_vault_a: string;
  fee_growth_global_a: bigint;
  token_mint_b: string;
  token_vault_b: string;
  fee_growth_global_b: bigint;
  reward_last_updated_timestamp: bigint;
  reward_infos: OrcaWhirlpoolRewardInfo[];
}

export interface OrcaWhirlpoolRewardInfo {
  mint: string;
  vault: string;
  authority: string;
  emissions_per_second_x64: bigint;
  growth_global_x64: bigint;
}

export interface OrcaPositionAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  position: OrcaPositionAccount;
}

export interface OrcaPositionAccount {
  whirlpool: string;
  position_mint: string;
  liquidity: bigint;
  tick_lower_index: number;
  tick_upper_index: number;
  fee_growth_checkpoint_a: bigint;
  fee_owed_a: bigint;
  fee_growth_checkpoint_b: bigint;
  fee_owed_b: bigint;
  reward_infos: OrcaPositionRewardInfo[];
}

export interface OrcaPositionRewardInfo {
  growth_inside_checkpoint: bigint;
  amount_owed: bigint;
}

export interface OrcaTickArrayAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  tick_array: OrcaTickArrayAccount;
}

export interface OrcaTickArrayAccount {
  start_tick_index: number;
  ticks: OrcaTick[];
  whirlpool: string;
}

export interface OrcaTick {
  initialized: boolean;
  liquidity_net: bigint;
  liquidity_gross: bigint;
  fee_growth_outside_a: bigint;
  fee_growth_outside_b: bigint;
  reward_growths_outside: bigint[];
}

export interface OrcaFeeTierAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  fee_tier: OrcaFeeTierAccount;
}

export interface OrcaFeeTierAccount {
  whirlpools_config: string;
  tick_spacing: number;
  default_fee_rate: number;
}

export interface OrcaWhirlpoolsConfigAccountEvent {
  metadata: EventMetadata;
  pubkey: string;
  config: OrcaWhirlpoolsConfigAccount;
}

export interface OrcaWhirlpoolsConfigAccount {
  fee_authority: string;
  collect_protocol_fees_authority: string;
  reward_emissions_super_authority: string;
  default_protocol_fee_rate: number;
}

export interface BlockMetaEvent {
  metadata: EventMetadata;
}

const ZERO = "11111111111111111111111111111111";

export function metadataForDexEvent(ev: DexEvent): EventMetadata | null {
  if ("Error" in ev) return null;
  const inner = Object.values(ev)[0] as { metadata?: EventMetadata };
  return inner?.metadata ?? null;
}

export function defaultPubkey(): string {
  return ZERO;
}
