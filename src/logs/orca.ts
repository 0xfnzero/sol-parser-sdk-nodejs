import type { EventMetadata } from "../core/metadata.js";
import type {
  DexEvent,
  OrcaWhirlpoolLiquidityDecreasedEvent,
  OrcaWhirlpoolLiquidityIncreasedEvent,
  OrcaWhirlpoolPoolInitializedEvent,
  OrcaWhirlpoolSwapEvent,
} from "../core/dex_event.js";
import { readBool, readPubkey, readU128LE, readU16LE, readU64LE, readU8, readI32LE } from "../util/binary.js";

function bn64(v: ReturnType<typeof readU64LE>): bigint {
  return v ?? 0n;
}

export function parseTradedFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const whirlpool = readPubkey(data, o)!;
  o += 32;
  const a_to_b = readBool(data, o)!;
  o += 1;
  const pre_sqrt_price = readU128LE(data, o)!;
  o += 16;
  const post_sqrt_price = readU128LE(data, o)!;
  o += 16;
  const input_amount = bn64(readU64LE(data, o));
  o += 8;
  const output_amount = bn64(readU64LE(data, o));
  o += 8;
  const input_transfer_fee = bn64(readU64LE(data, o));
  o += 8;
  const output_transfer_fee = bn64(readU64LE(data, o));
  o += 8;
  const lp_fee = bn64(readU64LE(data, o));
  o += 8;
  const protocol_fee = bn64(readU64LE(data, o));
  const ev: OrcaWhirlpoolSwapEvent = {
    metadata,
    whirlpool,
    a_to_b,
    pre_sqrt_price,
    post_sqrt_price,
    input_amount,
    output_amount,
    input_transfer_fee,
    output_transfer_fee,
    lp_fee,
    protocol_fee,
  };
  return { OrcaWhirlpoolSwap: ev };
}

export function parseLiquidityIncreasedFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const whirlpool = readPubkey(data, o)!;
  o += 32;
  const position = readPubkey(data, o)!;
  o += 32;
  const tick_lower_index = readI32LE(data, o)!;
  o += 4;
  const tick_upper_index = readI32LE(data, o)!;
  o += 4;
  const liquidity = readU128LE(data, o)!;
  o += 16;
  const token_a_amount = bn64(readU64LE(data, o));
  o += 8;
  const token_b_amount = bn64(readU64LE(data, o));
  o += 8;
  const token_a_transfer_fee = bn64(readU64LE(data, o));
  o += 8;
  const token_b_transfer_fee = bn64(readU64LE(data, o));
  const ev: OrcaWhirlpoolLiquidityIncreasedEvent = {
    metadata,
    whirlpool,
    position,
    tick_lower_index,
    tick_upper_index,
    liquidity,
    token_a_amount,
    token_b_amount,
    token_a_transfer_fee,
    token_b_transfer_fee,
  };
  return { OrcaWhirlpoolLiquidityIncreased: ev };
}

export function parseLiquidityDecreasedFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const whirlpool = readPubkey(data, o)!;
  o += 32;
  const position = readPubkey(data, o)!;
  o += 32;
  const tick_lower_index = readI32LE(data, o)!;
  o += 4;
  const tick_upper_index = readI32LE(data, o)!;
  o += 4;
  const liquidity = readU128LE(data, o)!;
  o += 16;
  const token_a_amount = bn64(readU64LE(data, o));
  o += 8;
  const token_b_amount = bn64(readU64LE(data, o));
  o += 8;
  const token_a_transfer_fee = bn64(readU64LE(data, o));
  o += 8;
  const token_b_transfer_fee = bn64(readU64LE(data, o));
  const ev: OrcaWhirlpoolLiquidityDecreasedEvent = {
    metadata,
    whirlpool,
    position,
    tick_lower_index,
    tick_upper_index,
    liquidity,
    token_a_amount,
    token_b_amount,
    token_a_transfer_fee,
    token_b_transfer_fee,
  };
  return { OrcaWhirlpoolLiquidityDecreased: ev };
}

export function parsePoolInitializedFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const whirlpool = readPubkey(data, o)!;
  o += 32;
  const whirlpools_config = readPubkey(data, o)!;
  o += 32;
  const token_mint_a = readPubkey(data, o)!;
  o += 32;
  const token_mint_b = readPubkey(data, o)!;
  o += 32;
  const tick_spacing = readU16LE(data, o)!;
  o += 2;
  const token_program_a = readPubkey(data, o)!;
  o += 32;
  const token_program_b = readPubkey(data, o)!;
  o += 32;
  const decimals_a = readU8(data, o)!;
  o += 1;
  const decimals_b = readU8(data, o)!;
  o += 1;
  const initial_sqrt_price = readU128LE(data, o)!;
  const ev: OrcaWhirlpoolPoolInitializedEvent = {
    metadata,
    whirlpool,
    whirlpools_config,
    token_mint_a,
    token_mint_b,
    tick_spacing,
    token_program_a,
    token_program_b,
    decimals_a,
    decimals_b,
    initial_sqrt_price,
  };
  return { OrcaWhirlpoolPoolInitialized: ev };
}
