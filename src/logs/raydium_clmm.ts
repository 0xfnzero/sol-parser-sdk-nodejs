import type { EventMetadata } from "../core/metadata.js";
import type {
  DexEvent,
  RaydiumClmmCollectFeeEvent,
  RaydiumClmmConfigChangeEvent,
  RaydiumClmmCreatePoolEvent,
  RaydiumClmmCreatePersonalPositionEvent,
  RaydiumClmmDecreaseLimitOrderEvent,
  RaydiumClmmDecreaseLiquidityEvent,
  RaydiumClmmIncreaseLimitOrderEvent,
  RaydiumClmmIncreaseLiquidityEvent,
  RaydiumClmmLiquidityCalculateEvent,
  RaydiumClmmLiquidityChangeEvent,
  RaydiumClmmOpenLimitOrderEvent,
  RaydiumClmmSettleLimitOrderEvent,
  RaydiumClmmSwapEvent,
  RaydiumClmmUpdateRewardInfosEvent,
} from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { readBool, readI32LE, readPubkey, readU128LE, readU16LE, readU32LE, readU64LE } from "../util/binary.js";

function bn64(v: ReturnType<typeof readU64LE>): bigint {
  return v ?? 0n;
}

export function parseSwapFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool_state = readPubkey(data, o);
  if (!pool_state) return null;
  o += 32;
  const sender = readPubkey(data, o);
  if (!sender) return null;
  o += 32;
  const token_account_0 = readPubkey(data, o);
  if (!token_account_0) return null;
  o += 32;
  const token_account_1 = readPubkey(data, o);
  if (!token_account_1) return null;
  o += 32;
  const amount_0 = readU64LE(data, o);
  if (amount_0 === null) return null;
  o += 8;
  const transfer_fee_0 = readU64LE(data, o);
  if (transfer_fee_0 === null) return null;
  o += 8;
  const amount_1 = readU64LE(data, o);
  if (amount_1 === null) return null;
  o += 8;
  const transfer_fee_1 = readU64LE(data, o);
  if (transfer_fee_1 === null) return null;
  o += 8;
  const zero_for_one = readBool(data, o);
  if (zero_for_one === null) return null;
  o += 1;
  const sqrt_price_x64 = readU128LE(data, o);
  if (sqrt_price_x64 === null) return null;
  o += 16;
  const liquidity = readU128LE(data, o);
  if (liquidity === null) return null;
  o += 16;
  const tick = readI32LE(data, o);
  if (tick === null) return null;
  const ev: RaydiumClmmSwapEvent = {
    metadata,
    pool_state,
    token_account_0,
    token_account_1,
    amount_0,
    amount_1,
    zero_for_one,
    sqrt_price_x64,
    liquidity,
    sender,
    transfer_fee_0,
    transfer_fee_1,
    tick,
  };
  return { RaydiumClmmSwap: ev };
}

export function parseIncreaseLiquidityFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const position_nft_mint = readPubkey(data, o);
  if (!position_nft_mint) return null;
  o += 32;
  const liquidity = readU128LE(data, o);
  if (liquidity === null) return null;
  o += 16;
  const amount_0 = readU64LE(data, o);
  if (amount_0 === null) return null;
  o += 8;
  const amount_1 = readU64LE(data, o);
  if (amount_1 === null) return null;
  o += 8;
  const amount_0_transfer_fee = readU64LE(data, o);
  if (amount_0_transfer_fee === null) return null;
  o += 8;
  const amount_1_transfer_fee = readU64LE(data, o);
  if (amount_1_transfer_fee === null) return null;
  const ev: RaydiumClmmIncreaseLiquidityEvent = {
    metadata,
    pool: defaultPubkey(),
    position_nft_mint,
    user: defaultPubkey(),
    liquidity,
    amount_0,
    amount_1,
    amount_0_transfer_fee,
    amount_1_transfer_fee,
    amount0_max: 0n,
    amount1_max: 0n,
  };
  return { RaydiumClmmIncreaseLiquidity: ev };
}

export function parseDecreaseLiquidityFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const position_nft_mint = readPubkey(data, o);
  if (!position_nft_mint) return null;
  o += 32;
  const liquidity = readU128LE(data, o);
  if (liquidity === null) return null;
  o += 16;
  const decrease_amount_0 = readU64LE(data, o);
  if (decrease_amount_0 === null) return null;
  o += 8;
  const decrease_amount_1 = readU64LE(data, o);
  if (decrease_amount_1 === null) return null;
  o += 8;
  const fee_amount_0 = readU64LE(data, o);
  if (fee_amount_0 === null) return null;
  o += 8;
  const fee_amount_1 = readU64LE(data, o);
  if (fee_amount_1 === null) return null;
  o += 8;
  const reward_amount_0 = readU64LE(data, o);
  if (reward_amount_0 === null) return null;
  o += 8;
  const reward_amount_1 = readU64LE(data, o);
  if (reward_amount_1 === null) return null;
  o += 8;
  const reward_amount_2 = readU64LE(data, o);
  if (reward_amount_2 === null) return null;
  o += 8;
  const transfer_fee_0 = readU64LE(data, o);
  if (transfer_fee_0 === null) return null;
  o += 8;
  const transfer_fee_1 = readU64LE(data, o);
  if (transfer_fee_1 === null) return null;
  const ev: RaydiumClmmDecreaseLiquidityEvent = {
    metadata,
    pool: defaultPubkey(),
    position_nft_mint,
    user: defaultPubkey(),
    liquidity,
    decrease_amount_0,
    decrease_amount_1,
    fee_amount_0,
    fee_amount_1,
    reward_amounts: [reward_amount_0, reward_amount_1, reward_amount_2],
    transfer_fee_0,
    transfer_fee_1,
    amount0_min: 0n,
    amount1_min: 0n,
  };
  return { RaydiumClmmDecreaseLiquidity: ev };
}

export function parseCreatePoolFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const token_0_mint = readPubkey(data, o);
  if (!token_0_mint) return null;
  o += 32;
  const token_1_mint = readPubkey(data, o);
  if (!token_1_mint) return null;
  o += 32;
  const tick_spacing = readU16LE(data, o);
  if (tick_spacing === null) return null;
  o += 2;
  const pool = readPubkey(data, o);
  if (!pool) return null;
  o += 32;
  const sqrt_price_x64 = readU128LE(data, o);
  if (sqrt_price_x64 === null) return null;
  o += 16;
  const tick = readI32LE(data, o);
  if (tick === null) return null;
  o += 4;
  const token_vault_0 = readPubkey(data, o);
  if (!token_vault_0) return null;
  o += 32;
  const token_vault_1 = readPubkey(data, o);
  if (!token_vault_1) return null;
  const ev: RaydiumClmmCreatePoolEvent = {
    metadata,
    pool,
    token_0_mint,
    token_1_mint,
    tick_spacing,
    fee_rate: 0,
    creator: defaultPubkey(),
    sqrt_price_x64,
    tick,
    token_vault_0,
    token_vault_1,
    open_time: 0n,
  };
  return { RaydiumClmmCreatePool: ev };
}

export function parseCollectPersonalFeeFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const position_nft_mint = readPubkey(data, o);
  if (!position_nft_mint) return null;
  o += 32;
  const recipient_token_account_0 = readPubkey(data, o);
  if (!recipient_token_account_0) return null;
  o += 32;
  const recipient_token_account_1 = readPubkey(data, o);
  if (!recipient_token_account_1) return null;
  o += 32;
  const amount_0 = bn64(readU64LE(data, o));
  o += 8;
  const amount_1 = bn64(readU64LE(data, o));
  const ev: RaydiumClmmCollectFeeEvent = {
    metadata,
    pool_state: defaultPubkey(),
    position_nft_mint,
    recipient_token_account_0,
    recipient_token_account_1,
    amount_0,
    amount_1,
  };
  return { RaydiumClmmCollectFee: ev };
}

export function parseCollectProtocolFeeFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool_state = readPubkey(data, o);
  if (!pool_state) return null;
  o += 32;
  const recipient_token_account_0 = readPubkey(data, o);
  if (!recipient_token_account_0) return null;
  o += 32;
  const recipient_token_account_1 = readPubkey(data, o);
  if (!recipient_token_account_1) return null;
  o += 32;
  const amount_0 = bn64(readU64LE(data, o));
  o += 8;
  const amount_1 = bn64(readU64LE(data, o));
  const ev: RaydiumClmmCollectFeeEvent = {
    metadata,
    pool_state,
    position_nft_mint: defaultPubkey(),
    recipient_token_account_0,
    recipient_token_account_1,
    amount_0,
    amount_1,
  };
  return { RaydiumClmmCollectFee: ev };
}

export function parseLiquidityChangeFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool_state = readPubkey(data, o);
  if (!pool_state) return null;
  o += 32;
  const tick = readI32LE(data, o);
  if (tick === null) return null;
  o += 4;
  const tick_lower = readI32LE(data, o);
  if (tick_lower === null) return null;
  o += 4;
  const tick_upper = readI32LE(data, o);
  if (tick_upper === null) return null;
  o += 4;
  const liquidity_before = readU128LE(data, o);
  if (liquidity_before === null) return null;
  o += 16;
  const liquidity_after = readU128LE(data, o);
  if (liquidity_after === null) return null;
  const ev: RaydiumClmmLiquidityChangeEvent = {
    metadata,
    pool_state,
    tick,
    tick_lower,
    tick_upper,
    liquidity_before,
    liquidity_after,
  };
  return { RaydiumClmmLiquidityChange: ev };
}

export function parseConfigChangeFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const index = readU16LE(data, o);
  if (index === null) return null;
  o += 2;
  const owner = readPubkey(data, o);
  if (!owner) return null;
  o += 32;
  const protocol_fee_rate = readU32LE(data, o);
  if (protocol_fee_rate === null) return null;
  o += 4;
  const trade_fee_rate = readU32LE(data, o);
  if (trade_fee_rate === null) return null;
  o += 4;
  const tick_spacing = readU16LE(data, o);
  if (tick_spacing === null) return null;
  o += 2;
  const fund_fee_rate = readU32LE(data, o);
  if (fund_fee_rate === null) return null;
  o += 4;
  const fund_owner = readPubkey(data, o);
  if (!fund_owner) return null;
  const ev: RaydiumClmmConfigChangeEvent = {
    metadata,
    index,
    owner,
    protocol_fee_rate,
    trade_fee_rate,
    tick_spacing,
    fund_fee_rate,
    fund_owner,
  };
  return { RaydiumClmmConfigChange: ev };
}

export function parseCreatePersonalPositionFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool_state = readPubkey(data, o);
  if (!pool_state) return null;
  o += 32;
  const minter = readPubkey(data, o);
  if (!minter) return null;
  o += 32;
  const nft_owner = readPubkey(data, o);
  if (!nft_owner) return null;
  o += 32;
  const tick_lower_index = readI32LE(data, o);
  if (tick_lower_index === null) return null;
  o += 4;
  const tick_upper_index = readI32LE(data, o);
  if (tick_upper_index === null) return null;
  o += 4;
  const liquidity = readU128LE(data, o);
  if (liquidity === null) return null;
  o += 16;
  const deposit_amount_0 = bn64(readU64LE(data, o));
  o += 8;
  const deposit_amount_1 = bn64(readU64LE(data, o));
  o += 8;
  const deposit_amount_0_transfer_fee = bn64(readU64LE(data, o));
  o += 8;
  const deposit_amount_1_transfer_fee = readU64LE(data, o);
  if (deposit_amount_1_transfer_fee === null) return null;
  const ev: RaydiumClmmCreatePersonalPositionEvent = {
    metadata,
    pool_state,
    minter,
    nft_owner,
    tick_lower_index,
    tick_upper_index,
    liquidity,
    deposit_amount_0,
    deposit_amount_1,
    deposit_amount_0_transfer_fee,
    deposit_amount_1_transfer_fee,
  };
  return { RaydiumClmmCreatePersonalPosition: ev };
}

export function parseLiquidityCalculateFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool_liquidity = readU128LE(data, o);
  if (pool_liquidity === null) return null;
  o += 16;
  const pool_sqrt_price_x64 = readU128LE(data, o);
  if (pool_sqrt_price_x64 === null) return null;
  o += 16;
  const pool_tick = readI32LE(data, o);
  if (pool_tick === null) return null;
  o += 4;
  const calc_amount_0 = bn64(readU64LE(data, o));
  o += 8;
  const calc_amount_1 = bn64(readU64LE(data, o));
  o += 8;
  const trade_fee_owed_0 = bn64(readU64LE(data, o));
  o += 8;
  const trade_fee_owed_1 = bn64(readU64LE(data, o));
  o += 8;
  const transfer_fee_0 = bn64(readU64LE(data, o));
  o += 8;
  const transfer_fee_1 = readU64LE(data, o);
  if (transfer_fee_1 === null) return null;
  const ev: RaydiumClmmLiquidityCalculateEvent = {
    metadata,
    pool_liquidity,
    pool_sqrt_price_x64,
    pool_tick,
    calc_amount_0,
    calc_amount_1,
    trade_fee_owed_0,
    trade_fee_owed_1,
    transfer_fee_0,
    transfer_fee_1,
  };
  return { RaydiumClmmLiquidityCalculate: ev };
}

export function parseOpenLimitOrderFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool_id = readPubkey(data, o);
  if (!pool_id) return null;
  o += 32;
  const limit_order = readPubkey(data, o);
  if (!limit_order) return null;
  o += 32;
  const zero_for_one = readBool(data, o);
  if (zero_for_one === null) return null;
  o += 1;
  const tick_index = readI32LE(data, o);
  if (tick_index === null) return null;
  o += 4;
  const total_amount = bn64(readU64LE(data, o));
  o += 8;
  const transfer_fee = readU64LE(data, o);
  if (transfer_fee === null) return null;
  const ev: RaydiumClmmOpenLimitOrderEvent = {
    metadata,
    pool_id,
    limit_order,
    zero_for_one,
    tick_index,
    total_amount,
    transfer_fee,
  };
  return { RaydiumClmmOpenLimitOrder: ev };
}

export function parseIncreaseLimitOrderFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool_id = readPubkey(data, o);
  if (!pool_id) return null;
  o += 32;
  const limit_order = readPubkey(data, o);
  if (!limit_order) return null;
  o += 32;
  const zero_for_one = readBool(data, o);
  if (zero_for_one === null) return null;
  o += 1;
  const tick_index = readI32LE(data, o);
  if (tick_index === null) return null;
  o += 4;
  const total_amount = bn64(readU64LE(data, o));
  o += 8;
  const increased_amount = bn64(readU64LE(data, o));
  o += 8;
  const transfer_fee = readU64LE(data, o);
  if (transfer_fee === null) return null;
  const ev: RaydiumClmmIncreaseLimitOrderEvent = {
    metadata,
    pool_id,
    limit_order,
    zero_for_one,
    tick_index,
    total_amount,
    increased_amount,
    transfer_fee,
  };
  return { RaydiumClmmIncreaseLimitOrder: ev };
}

export function parseDecreaseLimitOrderFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool_id = readPubkey(data, o);
  if (!pool_id) return null;
  o += 32;
  const limit_order = readPubkey(data, o);
  if (!limit_order) return null;
  o += 32;
  const zero_for_one = readBool(data, o);
  if (zero_for_one === null) return null;
  o += 1;
  const tick_index = readI32LE(data, o);
  if (tick_index === null) return null;
  o += 4;
  const total_amount = bn64(readU64LE(data, o));
  o += 8;
  const filled_amount = bn64(readU64LE(data, o));
  o += 8;
  const settled_output_amount = bn64(readU64LE(data, o));
  o += 8;
  const decreased_amount = readU64LE(data, o);
  if (decreased_amount === null) return null;
  const ev: RaydiumClmmDecreaseLimitOrderEvent = {
    metadata,
    pool_id,
    limit_order,
    zero_for_one,
    tick_index,
    total_amount,
    filled_amount,
    settled_output_amount,
    decreased_amount,
  };
  return { RaydiumClmmDecreaseLimitOrder: ev };
}

export function parseSettleLimitOrderFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool_id = readPubkey(data, o);
  if (!pool_id) return null;
  o += 32;
  const limit_order = readPubkey(data, o);
  if (!limit_order) return null;
  o += 32;
  const zero_for_one = readBool(data, o);
  if (zero_for_one === null) return null;
  o += 1;
  const tick_index = readI32LE(data, o);
  if (tick_index === null) return null;
  o += 4;
  const total_amount = bn64(readU64LE(data, o));
  o += 8;
  const filled_amount = bn64(readU64LE(data, o));
  o += 8;
  const settled_amount_out = readU64LE(data, o);
  if (settled_amount_out === null) return null;
  const ev: RaydiumClmmSettleLimitOrderEvent = {
    metadata,
    pool_id,
    limit_order,
    zero_for_one,
    tick_index,
    total_amount,
    filled_amount,
    settled_amount_out,
  };
  return { RaydiumClmmSettleLimitOrder: ev };
}

export function parseUpdateRewardInfosFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  const r0 = readU128LE(data, 0);
  const r1 = readU128LE(data, 16);
  const r2 = readU128LE(data, 32);
  if (r0 === null || r1 === null || r2 === null) return null;
  const ev: RaydiumClmmUpdateRewardInfosEvent = {
    metadata,
    reward_growth_global_x64: [r0, r1, r2],
  };
  return { RaydiumClmmUpdateRewardInfos: ev };
}
