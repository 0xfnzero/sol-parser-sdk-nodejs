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
  SWAP2: disc([189, 66, 51, 168, 38, 80, 117, 153]),
  SWAP2_TRANSFER_HOOK: disc([134, 59, 168, 120, 94, 51, 114, 231]),
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
  if (discriminator === METEORA_DBC_DISC.SWAP2 || discriminator === METEORA_DBC_DISC.SWAP2_TRANSFER_HOOK) return parseMeteoraDbcSwap2FromData(data, metadata, discriminator === METEORA_DBC_DISC.SWAP2_TRANSFER_HOOK);
  if (discriminator === METEORA_DBC_DISC.SWAP) return parseMeteoraDbcSwapFromData(data, metadata);
  if (discriminator === METEORA_DBC_DISC.INITIALIZE_POOL) {
    return parseMeteoraDbcInitializePoolFromData(data, metadata);
  }
  if (discriminator === METEORA_DBC_DISC.CURVE_COMPLETE) {
    return parseMeteoraDbcCurveCompleteFromData(data, metadata);
  }
  return null;
}

export function parseMeteoraDbcSwap2FromData(data: Uint8Array, metadata: EventMetadata, has_transfer_hook: boolean): DexEvent | null {
  if (data.length < 179 || data[82]! > 2 || data[64]! > 1 || data[65]! > 1) return null;
  const swap_mode = data[82]!;
  const u64 = (offset: number) => readU64LE(data, offset)!;
  const amount_0 = u64(66), amount_1 = u64(74), included_fee_input_amount = u64(83);
  return { MeteoraDbcSwap: {
    metadata, pool: readPubkey(data,0)!, config: readPubkey(data,32)!,
    trade_direction: data[64]!, has_referral: Boolean(data[65]), event_version: 2,
    swap_mode, amount_0, amount_1, has_transfer_hook,
    amount_in: included_fee_input_amount, minimum_amount_out: swap_mode === 2 ? 0n : amount_1,
    maximum_amount_in: swap_mode === 2 ? amount_1 : 0n,
    included_fee_input_amount, actual_input_amount: u64(91), amount_left: u64(99),
    output_amount: u64(107), next_sqrt_price: readU128LE(data,115)!,
    trading_fee: u64(131), protocol_fee: u64(139), referral_fee: u64(147),
    quote_reserve_amount: u64(155), migration_threshold: u64(163), current_timestamp: u64(171),
  }};
}
