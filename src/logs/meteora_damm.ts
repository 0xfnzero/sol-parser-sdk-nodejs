import { makeMetadata, type EventMetadata } from "../core/metadata.js";
import type {
  DexEvent,
  MeteoraDammV2DynamicFeeParameters,
  MeteoraDammV2PoolFeeParameters,
  MeteoraDammV2SwapEvent,
} from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { decodeProgramDataLine } from "./program_data.js";
import {
  readBool,
  readPubkey,
  readU128LE,
  readU16LE,
  readU32LE,
  readU64LE,
  readU8,
} from "../util/binary.js";

function discOf(bytes: readonly number[]): bigint {
  const u8 = new Uint8Array(8);
  for (let i = 0; i < 8; i++) u8[i] = bytes[i]!;
  return new DataView(u8.buffer).getBigUint64(0, true);
}

const SWAP = discOf([27, 60, 21, 213, 138, 170, 187, 147]);
const SWAP2 = discOf([189, 66, 51, 168, 38, 80, 117, 153]);
/** 与 `instr/meteora_damm_ix.ts` CPI 内层事件 disc 一致；Program data 去掉前 8 字节后与 CPI 载荷布局相同 */
const CREATE_POSITION = discOf([156, 15, 119, 198, 29, 181, 221, 55]);
const CLOSE_POSITION = discOf([20, 145, 144, 68, 143, 142, 214, 178]);
const ADD_LIQUIDITY = discOf([175, 242, 8, 157, 30, 247, 185, 169]);
const REMOVE_LIQUIDITY = discOf([87, 46, 88, 98, 175, 96, 34, 91]);
/** Meteora `cp-amm` `EvtInitializePool`（见 `programs/cp-amm/src/event.rs`） */
const INITIALIZE_POOL = discOf([228, 50, 246, 85, 203, 66, 134, 37]);

function bn64(v: ReturnType<typeof readU64LE>): bigint {
  return v ?? 0n;
}

function emptyVaults(): Pick<
  MeteoraDammV2SwapEvent,
  "token_a_vault" | "token_b_vault" | "token_a_mint" | "token_b_mint" | "token_a_program" | "token_b_program"
> {
  const z = defaultPubkey();
  return {
    token_a_vault: z,
    token_b_vault: z,
    token_a_mint: z,
    token_b_mint: z,
    token_a_program: z,
    token_b_program: z,
  };
}

function parseSwapEvent(data: Uint8Array, meta: EventMetadata): DexEvent | null {
  let o = 0;
  const pool = readPubkey(data, o)!;
  o += 32;
  o += 32;
  const trade_direction = readU8(data, o)!;
  o += 1;
  const has_referral = readBool(data, o)!;
  o += 1;
  const amount_in = bn64(readU64LE(data, o));
  o += 8;
  const minimum_amount_out = bn64(readU64LE(data, o));
  o += 8;
  const actual_input_amount = bn64(readU64LE(data, o));
  o += 8;
  const output_amount = bn64(readU64LE(data, o));
  o += 8;
  const next_sqrt_price = readU128LE(data, o)!;
  o += 16;
  const lp_fee = bn64(readU64LE(data, o));
  o += 8;
  const protocol_fee = bn64(readU64LE(data, o));
  o += 8;
  const referral_fee = bn64(readU64LE(data, o));
  o += 8;
  o += 8;
  const current_timestamp = bn64(readU64LE(data, o));
  const ev: MeteoraDammV2SwapEvent = {
    metadata: meta,
    pool,
    amount_in,
    output_amount,
    trade_direction,
    has_referral,
    minimum_amount_out,
    next_sqrt_price,
    lp_fee,
    protocol_fee,
    partner_fee: 0n,
    referral_fee,
    actual_amount_in: actual_input_amount,
    current_timestamp,
    ...emptyVaults(),
  };
  return { MeteoraDammV2Swap: ev };
}

function parseSwap2Event(data: Uint8Array, meta: EventMetadata): DexEvent | null {
  let o = 0;
  const pool = readPubkey(data, o)!;
  o += 32;
  const trade_direction = readU8(data, o)!;
  o += 1;
  o += 1;
  const has_referral = readBool(data, o)!;
  o += 1;
  const amount_0 = bn64(readU64LE(data, o));
  o += 8;
  const amount_1 = bn64(readU64LE(data, o));
  o += 8;
  const swap_mode = readU8(data, o)!;
  o += 1;
  const included_fee_input_amount = bn64(readU64LE(data, o));
  o += 8;
  o += 8;
  o += 8;
  const output_amount = bn64(readU64LE(data, o));
  o += 8;
  const next_sqrt_price = readU128LE(data, o)!;
  o += 16;
  const lp_fee = bn64(readU64LE(data, o));
  o += 8;
  const protocol_fee = bn64(readU64LE(data, o));
  o += 8;
  const referral_fee = bn64(readU64LE(data, o));
  o += 8;
  o += 8;
  o += 8;
  const current_timestamp = bn64(readU64LE(data, o));
  const [amount_in, minimum_amount_out] =
    swap_mode === 0 ? [amount_0, amount_1] : [amount_1, amount_0];
  const ev: MeteoraDammV2SwapEvent = {
    metadata: meta,
    pool,
    amount_in,
    output_amount,
    trade_direction,
    has_referral,
    minimum_amount_out,
    next_sqrt_price,
    lp_fee,
    protocol_fee,
    partner_fee: 0n,
    referral_fee,
    actual_amount_in: included_fee_input_amount,
    current_timestamp,
    ...emptyVaults(),
  };
  return { MeteoraDammV2Swap: ev };
}

function parseCreatePositionEvent(data: Uint8Array, meta: EventMetadata): DexEvent | null {
  if (data.length < 32 * 4) return null;
  let o = 0;
  const pool = readPubkey(data, o);
  if (!pool) return null;
  o += 32;
  const owner = readPubkey(data, o);
  if (!owner) return null;
  o += 32;
  const position = readPubkey(data, o);
  if (!position) return null;
  o += 32;
  const position_nft_mint = readPubkey(data, o);
  if (!position_nft_mint) return null;
  return { MeteoraDammV2CreatePosition: { metadata: meta, pool, owner, position, position_nft_mint } };
}

function parseClosePositionEvent(data: Uint8Array, meta: EventMetadata): DexEvent | null {
  if (data.length < 32 * 4) return null;
  let o = 0;
  const pool = readPubkey(data, o);
  if (!pool) return null;
  o += 32;
  const owner = readPubkey(data, o);
  if (!owner) return null;
  o += 32;
  const position = readPubkey(data, o);
  if (!position) return null;
  o += 32;
  const position_nft_mint = readPubkey(data, o);
  if (!position_nft_mint) return null;
  return { MeteoraDammV2ClosePosition: { metadata: meta, pool, owner, position, position_nft_mint } };
}

function parseAddLiquidityEvent(data: Uint8Array, meta: EventMetadata): DexEvent | null {
  if (data.length < 32 * 3 + 16 + 8 * 6) return null;
  let o = 0;
  const pool = readPubkey(data, o);
  if (!pool) return null;
  o += 32;
  const position = readPubkey(data, o);
  if (!position) return null;
  o += 32;
  const owner = readPubkey(data, o);
  if (!owner) return null;
  o += 32;
  const liquidity_delta = readU128LE(data, o);
  if (liquidity_delta === null) return null;
  o += 16;
  const token_a_amount_threshold = readU64LE(data, o);
  if (token_a_amount_threshold === null) return null;
  o += 8;
  const token_b_amount_threshold = readU64LE(data, o);
  if (token_b_amount_threshold === null) return null;
  o += 8;
  const token_a_amount = readU64LE(data, o);
  if (token_a_amount === null) return null;
  o += 8;
  const token_b_amount = readU64LE(data, o);
  if (token_b_amount === null) return null;
  o += 8;
  const total_amount_a = readU64LE(data, o);
  if (total_amount_a === null) return null;
  o += 8;
  const total_amount_b = readU64LE(data, o);
  if (total_amount_b === null) return null;
  return {
    MeteoraDammV2AddLiquidity: {
      metadata: meta,
      pool,
      position,
      owner,
      liquidity_delta,
      token_a_amount_threshold,
      token_b_amount_threshold,
      token_a_amount,
      token_b_amount,
      total_amount_a,
      total_amount_b,
    },
  };
}

function parseRemoveLiquidityEvent(data: Uint8Array, meta: EventMetadata): DexEvent | null {
  if (data.length < 32 * 3 + 16 + 8 * 4) return null;
  let o = 0;
  const pool = readPubkey(data, o);
  if (!pool) return null;
  o += 32;
  const position = readPubkey(data, o);
  if (!position) return null;
  o += 32;
  const owner = readPubkey(data, o);
  if (!owner) return null;
  o += 32;
  const liquidity_delta = readU128LE(data, o);
  if (liquidity_delta === null) return null;
  o += 16;
  const token_a_amount_threshold = readU64LE(data, o);
  if (token_a_amount_threshold === null) return null;
  o += 8;
  const token_b_amount_threshold = readU64LE(data, o);
  if (token_b_amount_threshold === null) return null;
  o += 8;
  const token_a_amount = readU64LE(data, o);
  if (token_a_amount === null) return null;
  o += 8;
  const token_b_amount = readU64LE(data, o);
  if (token_b_amount === null) return null;
  return {
    MeteoraDammV2RemoveLiquidity: {
      metadata: meta,
      pool,
      position,
      owner,
      liquidity_delta,
      token_a_amount_threshold,
      token_b_amount_threshold,
      token_a_amount,
      token_b_amount,
    },
  };
}

function bytesToHex(u8: Uint8Array, start: number, len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += u8[start + i]!.toString(16).padStart(2, "0");
  return out;
}

function parseDynamicFeeParameters(
  data: Uint8Array,
  start: number
): { v: MeteoraDammV2DynamicFeeParameters; next: number } | null {
  let o = start;
  const bin_step = readU16LE(data, o);
  if (bin_step === null) return null;
  o += 2;
  const bin_step_u128 = readU128LE(data, o);
  if (bin_step_u128 === null) return null;
  o += 16;
  const filter_period = readU16LE(data, o);
  if (filter_period === null) return null;
  o += 2;
  const decay_period = readU16LE(data, o);
  if (decay_period === null) return null;
  o += 2;
  const reduction_factor = readU16LE(data, o);
  if (reduction_factor === null) return null;
  o += 2;
  const max_volatility_accumulator = readU32LE(data, o);
  if (max_volatility_accumulator === null) return null;
  o += 4;
  const variable_fee_control = readU32LE(data, o);
  if (variable_fee_control === null) return null;
  o += 4;
  return {
    v: {
      bin_step,
      bin_step_u128,
      filter_period,
      decay_period,
      reduction_factor,
      max_volatility_accumulator,
      variable_fee_control,
    },
    next: o,
  };
}

function parsePoolFeeParametersParsed(
  data: Uint8Array,
  start: number
): { v: MeteoraDammV2PoolFeeParameters; next: number } | null {
  let o = start;
  if (o + 30 > data.length) return null;
  const base_fee_data = bytesToHex(data, o, 27);
  o += 27;
  const compounding_fee_bps = readU16LE(data, o);
  if (compounding_fee_bps === null) return null;
  o += 2;
  const padding = readU8(data, o);
  if (padding === null) return null;
  o += 1;
  const tag = readU8(data, o);
  if (tag === null) return null;
  o += 1;
  let dynamic_fee: MeteoraDammV2DynamicFeeParameters | null = null;
  if (tag === 1) {
    const inner = parseDynamicFeeParameters(data, o);
    if (!inner) return null;
    dynamic_fee = inner.v;
    o = inner.next;
  } else if (tag !== 0) return null;
  return {
    v: { base_fee_data, compounding_fee_bps, padding, dynamic_fee },
    next: o,
  };
}

/** `EvtInitializePool`：6 个 pubkey 后接 `PoolFeeParameters`（变长 Option）再接固定尾部 109 字节 */
export function parseInitializePoolEvent(data: Uint8Array, meta: EventMetadata): DexEvent | null {
  const minTail = 31 + 109;
  if (data.length < 32 * 6 + minTail) return null;
  let o = 0;
  const pool = readPubkey(data, o);
  if (!pool) return null;
  o += 32;
  const token_a_mint = readPubkey(data, o);
  if (!token_a_mint) return null;
  o += 32;
  const token_b_mint = readPubkey(data, o);
  if (!token_b_mint) return null;
  o += 32;
  const creator = readPubkey(data, o);
  if (!creator) return null;
  o += 32;
  const payer = readPubkey(data, o);
  if (!payer) return null;
  o += 32;
  const alpha_vault = readPubkey(data, o);
  if (!alpha_vault) return null;
  o += 32;
  const pfp = parsePoolFeeParametersParsed(data, o);
  if (!pfp) return null;
  o = pfp.next;
  if (o + 109 > data.length) return null;
  const sqrt_min_price = readU128LE(data, o);
  if (sqrt_min_price === null) return null;
  o += 16;
  const sqrt_max_price = readU128LE(data, o);
  if (sqrt_max_price === null) return null;
  o += 16;
  const activation_type = readU8(data, o);
  if (activation_type === null) return null;
  o += 1;
  const collect_fee_mode = readU8(data, o);
  if (collect_fee_mode === null) return null;
  o += 1;
  const liquidity = readU128LE(data, o);
  if (liquidity === null) return null;
  o += 16;
  const sqrt_price = readU128LE(data, o);
  if (sqrt_price === null) return null;
  o += 16;
  const activation_point = readU64LE(data, o);
  if (activation_point === null) return null;
  o += 8;
  const token_a_flag = readU8(data, o);
  if (token_a_flag === null) return null;
  o += 1;
  const token_b_flag = readU8(data, o);
  if (token_b_flag === null) return null;
  o += 1;
  const token_a_amount = readU64LE(data, o);
  if (token_a_amount === null) return null;
  o += 8;
  const token_b_amount = readU64LE(data, o);
  if (token_b_amount === null) return null;
  o += 8;
  const total_amount_a = readU64LE(data, o);
  if (total_amount_a === null) return null;
  o += 8;
  const total_amount_b = readU64LE(data, o);
  if (total_amount_b === null) return null;
  o += 8;
  const pool_type = readU8(data, o);
  if (pool_type === null) return null;
  return {
    MeteoraDammV2InitializePool: {
      metadata: meta,
      pool,
      token_a_mint,
      token_b_mint,
      creator,
      payer,
      alpha_vault,
      pool_fees: pfp.v,
      sqrt_min_price,
      sqrt_max_price,
      activation_type,
      collect_fee_mode,
      liquidity,
      sqrt_price,
      activation_point,
      token_a_flag,
      token_b_flag,
      token_a_amount,
      token_b_amount,
      total_amount_a,
      total_amount_b,
      pool_type,
    },
  };
}

/** Meteora DAMM Program data 入口；布局与 `parseMeteoraDammInstruction` CPI 内层载荷一致（Swap/Swap2 另含日志侧 32 字节填充，见 parseSwapEvent） */
export function parseMeteoraDammLog(
  log: string,
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number
): DexEvent | null {
  const programData = decodeProgramDataLine(log);
  if (!programData) return null;
  const disc = new DataView(programData.buffer, programData.byteOffset, 8).getBigUint64(0, true);
  const data = programData.subarray(8);
  const meta = makeMetadata(signature, slot, txIndex, blockTimeUs, grpcRecvUs);
  if (disc === SWAP) return parseSwapEvent(data, meta);
  if (disc === SWAP2) return parseSwap2Event(data, meta);
  if (disc === CREATE_POSITION) return parseCreatePositionEvent(data, meta);
  if (disc === CLOSE_POSITION) return parseClosePositionEvent(data, meta);
  if (disc === ADD_LIQUIDITY) return parseAddLiquidityEvent(data, meta);
  if (disc === REMOVE_LIQUIDITY) return parseRemoveLiquidityEvent(data, meta);
  if (disc === INITIALIZE_POOL) return parseInitializePoolEvent(data, meta);
  return null;
}
