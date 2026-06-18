import { makeMetadata, type EventMetadata } from "../core/metadata.js";
import type {
  DexEvent,
  MeteoraDammV2AddLiquidityEvent,
  MeteoraDammV2ClosePositionEvent,
  MeteoraDammV2CreatePositionEvent,
  MeteoraDammV2InitializePoolEvent,
  MeteoraDammV2RemoveLiquidityEvent,
  MeteoraDammV2SwapEvent,
} from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { decodeProgramDataLine } from "./program_data.js";
import { readBool, readPubkey, readU128LE, readU16LE, readU64LE, readU8 } from "../util/binary.js";

function discOf(bytes: readonly number[]): bigint {
  const u8 = new Uint8Array(8);
  for (let i = 0; i < 8; i++) u8[i] = bytes[i]!;
  return new DataView(u8.buffer).getBigUint64(0, true);
}

const SWAP = discOf([27, 60, 21, 213, 138, 170, 187, 147]);
const SWAP2 = discOf([189, 66, 51, 168, 38, 80, 117, 153]);
const ADD_LIQUIDITY = discOf([175, 242, 8, 157, 30, 247, 185, 169]);
const REMOVE_LIQUIDITY = discOf([87, 46, 88, 98, 175, 96, 34, 91]);
const INITIALIZE_POOL = discOf([228, 50, 246, 85, 203, 66, 134, 37]);
const CREATE_POSITION = discOf([156, 15, 119, 198, 29, 181, 221, 55]);
const CLOSE_POSITION = discOf([20, 145, 144, 68, 143, 142, 214, 178]);

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
  const pool = readPubkey(data, o)!;
  o += 32;
  const owner = readPubkey(data, o)!;
  o += 32;
  const position = readPubkey(data, o)!;
  o += 32;
  const position_nft_mint = readPubkey(data, o)!;
  const ev: MeteoraDammV2CreatePositionEvent = {
    metadata: meta,
    pool,
    owner,
    position,
    position_nft_mint,
  };
  return { MeteoraDammV2CreatePosition: ev };
}

function parseClosePositionEvent(data: Uint8Array, meta: EventMetadata): DexEvent | null {
  if (data.length < 32 * 4) return null;
  let o = 0;
  const pool = readPubkey(data, o)!;
  o += 32;
  const owner = readPubkey(data, o)!;
  o += 32;
  const position = readPubkey(data, o)!;
  o += 32;
  const position_nft_mint = readPubkey(data, o)!;
  const ev: MeteoraDammV2ClosePositionEvent = {
    metadata: meta,
    pool,
    owner,
    position,
    position_nft_mint,
  };
  return { MeteoraDammV2ClosePosition: ev };
}

function parseAddLiquidityEvent(data: Uint8Array, meta: EventMetadata): DexEvent | null {
  if (data.length < 32 * 3 + 16 + 8 * 6) return null;
  let o = 0;
  const pool = readPubkey(data, o)!;
  o += 32;
  const position = readPubkey(data, o)!;
  o += 32;
  const owner = readPubkey(data, o)!;
  o += 32;
  const liquidity_delta = readU128LE(data, o)!;
  o += 16;
  const token_a_amount_threshold = bn64(readU64LE(data, o));
  o += 8;
  const token_b_amount_threshold = bn64(readU64LE(data, o));
  o += 8;
  const token_a_amount = bn64(readU64LE(data, o));
  o += 8;
  const token_b_amount = bn64(readU64LE(data, o));
  o += 8;
  const total_amount_a = bn64(readU64LE(data, o));
  o += 8;
  const total_amount_b = bn64(readU64LE(data, o));
  const ev: MeteoraDammV2AddLiquidityEvent = {
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
  };
  return { MeteoraDammV2AddLiquidity: ev };
}

function parseRemoveLiquidityEvent(data: Uint8Array, meta: EventMetadata): DexEvent | null {
  if (data.length < 32 * 3 + 16 + 8 * 4) return null;
  let o = 0;
  const pool = readPubkey(data, o)!;
  o += 32;
  const position = readPubkey(data, o)!;
  o += 32;
  const owner = readPubkey(data, o)!;
  o += 32;
  const liquidity_delta = readU128LE(data, o)!;
  o += 16;
  const token_a_amount_threshold = bn64(readU64LE(data, o));
  o += 8;
  const token_b_amount_threshold = bn64(readU64LE(data, o));
  o += 8;
  const token_a_amount = bn64(readU64LE(data, o));
  o += 8;
  const token_b_amount = bn64(readU64LE(data, o));
  const ev: MeteoraDammV2RemoveLiquidityEvent = {
    metadata: meta,
    pool,
    position,
    owner,
    liquidity_delta,
    token_a_amount_threshold,
    token_b_amount_threshold,
    token_a_amount,
    token_b_amount,
  };
  return { MeteoraDammV2RemoveLiquidity: ev };
}

function skipPoolFees(data: Uint8Array, offset: number): number | null {
  if (offset + 31 > data.length) return null;
  offset += 27;
  if (readU16LE(data, offset) === null) return null;
  offset += 2;
  if (readU8(data, offset) === null) return null;
  offset += 1;
  const tag = readU8(data, offset);
  if (tag === null) return null;
  offset += 1;
  if (tag === 1) {
    if (offset + 32 > data.length) return null;
    offset += 32;
  } else if (tag !== 0) {
    return null;
  }
  return offset;
}

function parseInitializePoolEvent(data: Uint8Array, meta: EventMetadata): DexEvent | null {
  if (data.length < 32 * 6 + 31 + 109) return null;
  let o = 0;
  const pool = readPubkey(data, o)!;
  o += 32;
  const token_a_mint = readPubkey(data, o)!;
  o += 32;
  const token_b_mint = readPubkey(data, o)!;
  o += 32;
  const creator = readPubkey(data, o)!;
  o += 32;
  const payer = readPubkey(data, o)!;
  o += 32;
  const alpha_vault = readPubkey(data, o)!;
  o += 32;
  const poolFeesEnd = skipPoolFees(data, o);
  if (poolFeesEnd === null) return null;
  o = poolFeesEnd;
  if (o + 109 > data.length) return null;
  const sqrt_min_price = readU128LE(data, o)!;
  o += 16;
  const sqrt_max_price = readU128LE(data, o)!;
  o += 16;
  const activation_type = readU8(data, o)!;
  o += 1;
  const collect_fee_mode = readU8(data, o)!;
  o += 1;
  const liquidity = readU128LE(data, o)!;
  o += 16;
  const sqrt_price = readU128LE(data, o)!;
  o += 16;
  const activation_point = bn64(readU64LE(data, o));
  o += 8;
  const token_a_flag = readU8(data, o)!;
  o += 1;
  const token_b_flag = readU8(data, o)!;
  o += 1;
  const token_a_amount = bn64(readU64LE(data, o));
  o += 8;
  const token_b_amount = bn64(readU64LE(data, o));
  o += 8;
  const total_amount_a = bn64(readU64LE(data, o));
  o += 8;
  const total_amount_b = bn64(readU64LE(data, o));
  o += 8;
  const pool_type = readU8(data, o)!;
  const ev: MeteoraDammV2InitializePoolEvent = {
    metadata: meta,
    pool,
    token_a_mint,
    token_b_mint,
    creator,
    payer,
    alpha_vault,
    pool_fees: null,
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
  };
  return { MeteoraDammV2InitializePool: ev };
}

/**
 * Meteora DAMM Program data 入口；与 Rust `logs/meteora_damm.rs` 一致。
 */
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
  if (disc === ADD_LIQUIDITY) return parseAddLiquidityEvent(data, meta);
  if (disc === REMOVE_LIQUIDITY) return parseRemoveLiquidityEvent(data, meta);
  if (disc === INITIALIZE_POOL) return parseInitializePoolEvent(data, meta);
  if (disc === CREATE_POSITION) return parseCreatePositionEvent(data, meta);
  if (disc === CLOSE_POSITION) return parseClosePositionEvent(data, meta);
  return null;
}
