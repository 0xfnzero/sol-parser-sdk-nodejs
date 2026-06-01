import type {
  DexEvent,
  MeteoraDbcCurveCompleteEvent,
  MeteoraDbcInitializePoolEvent,
  MeteoraDbcSwapEvent,
} from "../core/dex_event.js";
import type { EventMetadata } from "../core/metadata.js";
import { readBool, readPubkey, readU128LE, readU64LE, readU8 } from "../util/binary.js";

function disc(bytes: readonly number[]): bigint {
  const u8 = new Uint8Array(8);
  for (let i = 0; i < 8; i++) u8[i] = bytes[i]!;
  return new DataView(u8.buffer).getBigUint64(0, true);
}

export const METEORA_DBC_DISC = {
  SWAP: disc([27, 60, 21, 213, 138, 170, 187, 147]),
  INITIALIZE_POOL: disc([228, 50, 246, 85, 203, 66, 134, 37]),
  CURVE_COMPLETE: disc([229, 231, 86, 84, 156, 134, 75, 24]),
} as const;

function bn64(v: ReturnType<typeof readU64LE>): bigint {
  return v ?? 0n;
}

export function parseMeteoraDbcSwapFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool = readPubkey(data, o);
  o += 32;
  const config = readPubkey(data, o);
  o += 32;
  const trade_direction = readU8(data, o);
  o += 1;
  const has_referral = readBool(data, o);
  o += 1;
  const params_amount_in = readU64LE(data, o);
  o += 8;
  const minimum_amount_out = readU64LE(data, o);
  o += 8;
  const actual_input_amount = readU64LE(data, o);
  o += 8;
  const output_amount = readU64LE(data, o);
  o += 8;
  const next_sqrt_price = readU128LE(data, o);
  o += 16;
  const trading_fee = readU64LE(data, o);
  o += 8;
  const protocol_fee = readU64LE(data, o);
  o += 8;
  const referral_fee = readU64LE(data, o);
  o += 8;
  const amount_in = readU64LE(data, o) ?? params_amount_in;
  o += 8;
  const current_timestamp = readU64LE(data, o);

  if (
    !pool ||
    !config ||
    trade_direction === null ||
    has_referral === null ||
    params_amount_in === null ||
    minimum_amount_out === null ||
    actual_input_amount === null ||
    output_amount === null ||
    next_sqrt_price === null ||
    trading_fee === null ||
    protocol_fee === null ||
    referral_fee === null ||
    current_timestamp === null
  ) {
    return null;
  }

  const ev: MeteoraDbcSwapEvent = {
    metadata,
    pool,
    config,
    trade_direction,
    has_referral,
    amount_in: bn64(amount_in),
    minimum_amount_out: bn64(minimum_amount_out),
    actual_input_amount: bn64(actual_input_amount),
    output_amount: bn64(output_amount),
    next_sqrt_price,
    trading_fee: bn64(trading_fee),
    protocol_fee: bn64(protocol_fee),
    referral_fee: bn64(referral_fee),
    current_timestamp: bn64(current_timestamp),
  };
  return { MeteoraDbcSwap: ev };
}

export function parseMeteoraDbcInitializePoolFromData(
  data: Uint8Array,
  metadata: EventMetadata
): DexEvent | null {
  let o = 0;
  const pool = readPubkey(data, o);
  o += 32;
  const config = readPubkey(data, o);
  o += 32;
  const creator = readPubkey(data, o);
  o += 32;
  const base_mint = readPubkey(data, o);
  o += 32;
  const pool_type = readU8(data, o);
  o += 1;
  const activation_point = readU64LE(data, o);
  if (!pool || !config || !creator || !base_mint || pool_type === null || activation_point === null) {
    return null;
  }
  const ev: MeteoraDbcInitializePoolEvent = {
    metadata,
    pool,
    config,
    creator,
    base_mint,
    pool_type,
    activation_point: bn64(activation_point),
  };
  return { MeteoraDbcInitializePool: ev };
}

export function parseMeteoraDbcCurveCompleteFromData(
  data: Uint8Array,
  metadata: EventMetadata
): DexEvent | null {
  let o = 0;
  const pool = readPubkey(data, o);
  o += 32;
  const config = readPubkey(data, o);
  o += 32;
  const base_reserve = readU64LE(data, o);
  o += 8;
  const quote_reserve = readU64LE(data, o);
  if (!pool || !config || base_reserve === null || quote_reserve === null) return null;
  const ev: MeteoraDbcCurveCompleteEvent = {
    metadata,
    pool,
    config,
    base_reserve: bn64(base_reserve),
    quote_reserve: bn64(quote_reserve),
  };
  return { MeteoraDbcCurveComplete: ev };
}

export function parseMeteoraDbcFromDiscriminator(
  discriminator: bigint,
  data: Uint8Array,
  metadata: EventMetadata
): DexEvent | null {
  if (discriminator === METEORA_DBC_DISC.SWAP) return parseMeteoraDbcSwapFromData(data, metadata);
  if (discriminator === METEORA_DBC_DISC.INITIALIZE_POOL) {
    return parseMeteoraDbcInitializePoolFromData(data, metadata);
  }
  if (discriminator === METEORA_DBC_DISC.CURVE_COMPLETE) {
    return parseMeteoraDbcCurveCompleteFromData(data, metadata);
  }
  return null;
}
