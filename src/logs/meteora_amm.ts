import type { EventMetadata } from "../core/metadata.js";
import type {
  DexEvent,
  MeteoraPoolsAddLiquidityEvent,
  MeteoraPoolsBootstrapLiquidityEvent,
  MeteoraPoolsPoolCreatedEvent,
  MeteoraPoolsRemoveLiquidityEvent,
  MeteoraPoolsSetPoolFeesEvent,
  MeteoraPoolsSwapEvent,
} from "../core/dex_event.js";
import { readPubkey, readU64LE, readU8 } from "../util/binary.js";

function bn64(v: ReturnType<typeof readU64LE>): bigint {
  return v ?? 0n;
}

export function parseSwapFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const in_amount = bn64(readU64LE(data, o));
  o += 8;
  const out_amount = bn64(readU64LE(data, o));
  o += 8;
  const trade_fee = bn64(readU64LE(data, o));
  o += 8;
  const admin_fee = bn64(readU64LE(data, o));
  o += 8;
  const host_fee = bn64(readU64LE(data, o));
  const ev: MeteoraPoolsSwapEvent = { metadata, in_amount, out_amount, trade_fee, admin_fee, host_fee };
  return { MeteoraPoolsSwap: ev };
}

export function parseAddLiquidityFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const lp_mint_amount = bn64(readU64LE(data, o));
  o += 8;
  const token_a_amount = bn64(readU64LE(data, o));
  o += 8;
  const token_b_amount = bn64(readU64LE(data, o));
  const ev: MeteoraPoolsAddLiquidityEvent = { metadata, lp_mint_amount, token_a_amount, token_b_amount };
  return { MeteoraPoolsAddLiquidity: ev };
}

export function parseRemoveLiquidityFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const lp_unmint_amount = bn64(readU64LE(data, o));
  o += 8;
  const token_a_out_amount = bn64(readU64LE(data, o));
  o += 8;
  const token_b_out_amount = bn64(readU64LE(data, o));
  const ev: MeteoraPoolsRemoveLiquidityEvent = {
    metadata,
    lp_unmint_amount,
    token_a_out_amount,
    token_b_out_amount,
  };
  return { MeteoraPoolsRemoveLiquidity: ev };
}

export function parseBootstrapLiquidityFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const lp_mint_amount = bn64(readU64LE(data, o));
  o += 8;
  const token_a_amount = bn64(readU64LE(data, o));
  o += 8;
  const token_b_amount = bn64(readU64LE(data, o));
  o += 8;
  const pool = readPubkey(data, o)!;
  const ev: MeteoraPoolsBootstrapLiquidityEvent = {
    metadata,
    lp_mint_amount,
    token_a_amount,
    token_b_amount,
    pool,
  };
  return { MeteoraPoolsBootstrapLiquidity: ev };
}

export function parseSetPoolFeesFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  if (data.length < 8 + 8 + 8 + 8 + 32) return null;
  let o = 0;
  const trade_fee_numerator = bn64(readU64LE(data, o));
  o += 8;
  const trade_fee_denominator = bn64(readU64LE(data, o));
  o += 8;
  const owner_trade_fee_numerator = bn64(readU64LE(data, o));
  o += 8;
  const owner_trade_fee_denominator = bn64(readU64LE(data, o));
  o += 8;
  const pool = readPubkey(data, o)!;
  const ev: MeteoraPoolsSetPoolFeesEvent = {
    metadata,
    trade_fee_numerator,
    trade_fee_denominator,
    owner_trade_fee_numerator,
    owner_trade_fee_denominator,
    pool,
  };
  return { MeteoraPoolsSetPoolFees: ev };
}

export function parsePoolCreatedFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const lp_mint = readPubkey(data, o)!;
  o += 32;
  const token_a_mint = readPubkey(data, o)!;
  o += 32;
  const token_b_mint = readPubkey(data, o)!;
  o += 32;
  const pool_type = readU8(data, o)!;
  o += 1;
  const pool = readPubkey(data, o)!;
  const ev: MeteoraPoolsPoolCreatedEvent = {
    metadata,
    lp_mint,
    token_a_mint,
    token_b_mint,
    pool_type,
    pool,
  };
  return { MeteoraPoolsPoolCreated: ev };
}
