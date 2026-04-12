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
  | { MeteoraDammV2RemoveAllLiquidity: MeteoraDammV2RemoveAllLiquidityEvent }
  | { MeteoraDammV2CreatePosition: MeteoraDammV2CreatePositionEvent }
  | { MeteoraDammV2InitializePool: MeteoraDammV2InitializePoolEvent }
  | { MeteoraDammV2ClosePosition: MeteoraDammV2ClosePositionEvent }
  | { MeteoraDlmmSwap: MeteoraDlmmSwapEvent }
  | { MeteoraDlmmAddLiquidity: MeteoraDlmmAddLiquidityEvent }
  | { MeteoraDlmmRemoveLiquidity: MeteoraDlmmRemoveLiquidityEvent }
  | { MeteoraDlmmInitializePool: MeteoraDlmmInitializePoolEvent }
  | { MeteoraDlmmInitializeBinArray: MeteoraDlmmInitializeBinArrayEvent }
  | { MeteoraDlmmCreatePosition: MeteoraDlmmCreatePositionEvent }
  | { MeteoraDlmmClosePosition: MeteoraDlmmClosePositionEvent }
  | { MeteoraDlmmClaimFee: MeteoraDlmmClaimFeeEvent }
  | { BonkTrade: BonkTradeEvent }
  | { BonkPoolCreate: BonkPoolCreateEvent }
  | { BonkMigrateAmm: BonkMigrateAmmEvent }
  | { TokenInfo: TokenInfoEvent }
  | { TokenAccount: TokenAccountEvent }
  | { NonceAccount: NonceAccountEvent }
  | { PumpSwapGlobalConfigAccount: PumpSwapGlobalConfigAccountEvent }
  | { PumpSwapPoolAccount: PumpSwapPoolAccountEvent }
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
  is_cashback_coin: boolean;
  bonding_curve: string;
  associated_bonding_curve: string;
  token_program: string;
  creator_vault: string;
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
  amount_0: bigint;
  amount_1: bigint;
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

/** 外层 `remove_all_liquidity`；指令仅含两 u64 阈值，无 `liquidity_delta`。 */
export interface MeteoraDammV2RemoveAllLiquidityEvent {
  metadata: EventMetadata;
  pool: string;
  position: string;
  owner: string;
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

/**
 * 外层 `initialize_pool`（`InitializePoolParameters`）；无日志时仅含指令内字段与账户索引映射。
 * Go/Python 中 `liquidity` / `sqrt_price` 为十进制字符串；`activation_point` 为 `None` 或十进制字符串。
 */
export interface MeteoraDammV2InitializePoolEvent {
  metadata: EventMetadata;
  creator: string;
  position_nft_mint: string;
  pool: string;
  position: string;
  token_a_mint: string;
  token_b_mint: string;
  liquidity: bigint;
  sqrt_price: bigint;
  activation_point: bigint | null;
}

/** 与 `MeteoraDammV2ClosePositionEvent` 对齐 */
export interface MeteoraDammV2ClosePositionEvent {
  metadata: EventMetadata;
  pool: string;
  owner: string;
  position: string;
  position_nft_mint: string;
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

export interface BonkTradeEvent {
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

export interface BonkPoolCreateEvent {
  metadata: EventMetadata;
  base_mint_param: BaseMintParam;
  pool_state: string;
  creator: string;
}

export interface BonkMigrateAmmEvent {
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
