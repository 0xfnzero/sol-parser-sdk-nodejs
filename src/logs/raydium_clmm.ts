import type { EventMetadata } from "../core/metadata.js";
import type {
  DexEvent,
  RaydiumClmmCollectFeeEvent,
  RaydiumClmmCreatePoolEvent,
  RaydiumClmmDecreaseLiquidityEvent,
  RaydiumClmmIncreaseLiquidityEvent,
  RaydiumClmmSwapEvent,
} from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { readBool, readPubkey, readU128LE, readU64LE } from "../util/binary.js";

function bn64(v: ReturnType<typeof readU64LE>): bigint {
  return v ?? 0n;
}

/** Swap 日志载荷中 16 字节 u128 为 sqrt price limit，映射到 `RaydiumClmmSwapEvent.sqrt_price_x64`（与 Go/Python 字段名一致）。 */
export function parseSwapFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool_state = readPubkey(data, o);
  if (!pool_state) return null;
  o += 32;
  const user = readPubkey(data, o);
  if (!user) return null;
  o += 32;
  if (o + 8 + 8 + 16 + 1 > data.length) return null;
  o += 8;
  o += 8;
  const sqrt_price_limit_x64 = readU128LE(data, o)!;
  o += 16;
  const is_base_input = readBool(data, o)!;
  const ev: RaydiumClmmSwapEvent = {
    metadata,
    pool_state,
    token_account_0: defaultPubkey(),
    token_account_1: defaultPubkey(),
    amount_0: 0n,
    amount_1: 0n,
    zero_for_one: is_base_input,
    sqrt_price_x64: sqrt_price_limit_x64,
    liquidity: 0n,
    sender: user,
    transfer_fee_0: 0n,
    transfer_fee_1: 0n,
    tick: 0,
  };
  return { RaydiumClmmSwap: ev };
}

export function parseIncreaseLiquidityFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool = readPubkey(data, o);
  if (!pool) return null;
  o += 32;
  const user = readPubkey(data, o);
  if (!user) return null;
  o += 32;
  const liquidity = readU128LE(data, o)!;
  o += 16;
  const amount0_max = bn64(readU64LE(data, o));
  o += 8;
  const amount1_max = bn64(readU64LE(data, o));
  const ev: RaydiumClmmIncreaseLiquidityEvent = {
    metadata,
    pool,
    position_nft_mint: defaultPubkey(),
    user,
    liquidity,
    amount0_max,
    amount1_max,
  };
  return { RaydiumClmmIncreaseLiquidity: ev };
}

export function parseDecreaseLiquidityFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool = readPubkey(data, o);
  if (!pool) return null;
  o += 32;
  const user = readPubkey(data, o);
  if (!user) return null;
  o += 32;
  const liquidity = readU128LE(data, o)!;
  o += 16;
  const amount0_min = bn64(readU64LE(data, o));
  o += 8;
  const amount1_min = bn64(readU64LE(data, o));
  const ev: RaydiumClmmDecreaseLiquidityEvent = {
    metadata,
    pool,
    position_nft_mint: defaultPubkey(),
    user,
    liquidity,
    amount0_min,
    amount1_min,
  };
  return { RaydiumClmmDecreaseLiquidity: ev };
}

export function parseCreatePoolFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool = readPubkey(data, o);
  if (!pool) return null;
  o += 32;
  const creator = readPubkey(data, o);
  if (!creator) return null;
  o += 32;
  const sqrt_price_x64 = readU128LE(data, o)!;
  o += 16;
  const open_time = bn64(readU64LE(data, o));
  const ev: RaydiumClmmCreatePoolEvent = {
    metadata,
    pool,
    token_0_mint: defaultPubkey(),
    token_1_mint: defaultPubkey(),
    tick_spacing: 0,
    fee_rate: 0,
    creator,
    sqrt_price_x64,
    open_time,
  };
  return { RaydiumClmmCreatePool: ev };
}

export function parseCollectFeeFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool_state = readPubkey(data, o);
  if (!pool_state) return null;
  o += 32;
  const position_nft_mint = readPubkey(data, o);
  if (!position_nft_mint) return null;
  o += 32;
  const amount_0 = bn64(readU64LE(data, o));
  o += 8;
  const amount_1 = bn64(readU64LE(data, o));
  const ev: RaydiumClmmCollectFeeEvent = { metadata, pool_state, position_nft_mint, amount_0, amount_1 };
  return { RaydiumClmmCollectFee: ev };
}
