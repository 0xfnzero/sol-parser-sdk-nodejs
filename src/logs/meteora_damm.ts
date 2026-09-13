import { makeMetadata, type EventMetadata } from "../core/metadata.js";
import type {
  DexEvent,
  MeteoraDammV2AddLiquidityEvent,
  MeteoraDammV2ClosePositionEvent,
  MeteoraDammV2CreateConfigEvent,
  MeteoraDammV2CreateDynamicConfigEvent,
  MeteoraDammV2CreatePositionEvent,
  MeteoraDammV2DynamicFeeParameters,
  MeteoraDammV2InitializePoolEvent,
  MeteoraDammV2RemoveLiquidityEvent,
  MeteoraDammV2SwapEvent,
  MeteoraDammV2UpdateDelegatePermissionEvent,
  MeteoraDammV2WithdrawDeadLiquidityRewardEvent,
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
const ADD_LIQUIDITY = discOf([175, 242, 8, 157, 30, 247, 185, 169]);
const REMOVE_LIQUIDITY = discOf([87, 46, 88, 98, 175, 96, 34, 91]);
const LIQUIDITY_CHANGE = discOf([197, 171, 78, 127, 224, 211, 87, 13]);
const INITIALIZE_POOL = discOf([228, 50, 246, 85, 203, 66, 134, 37]);
const CREATE_POSITION = discOf([156, 15, 119, 198, 29, 181, 221, 55]);
const CLOSE_POSITION = discOf([20, 145, 144, 68, 143, 142, 214, 178]);
const UPDATE_DELEGATE_PERMISSION = discOf([66, 188, 75, 151, 150, 232, 87, 93]);
const WITHDRAW_DEAD_LIQUIDITY_REWARD = discOf([228, 66, 150, 195, 42, 62, 163, 13]);
const CREATE_CONFIG = discOf([131, 207, 180, 174, 180, 73, 165, 54]);
const CREATE_DYNAMIC_CONFIG = discOf([231, 197, 13, 164, 248, 213, 133, 152]);

/**
 * Mainnet upgrade that replaced `trading_fee/partner_fee` in `EvtSwap2` with
 * `claiming_fee/compounding_fee` without changing discriminator or size.
 */
export const COMPOUNDING_FEE_LAYOUT_ACTIVATION_SLOT = 406_048_752;

function usesCompoundingFeeLayout(slot: number): boolean {
  return slot === 0 || slot >= COMPOUNDING_FEE_LAYOUT_ACTIVATION_SLOT;
}

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
  const pool = readPubkey(data, o);
  if (!pool) return null;
  o += 32;
  o += 32;
  const trade_direction = readU8(data, o);
  if (trade_direction === null) return null;
  o += 1;
  const has_referral = readBool(data, o);
  if (has_referral === null) return null;
  o += 1;
  const amount_in = bn64(readU64LE(data, o));
  o += 8;
  const minimum_amount_out = bn64(readU64LE(data, o));
  o += 8;
  const actual_input_amount = bn64(readU64LE(data, o));
  o += 8;
  const output_amount = bn64(readU64LE(data, o));
  o += 8;
  const next_sqrt_price = readU128LE(data, o);
  if (next_sqrt_price === null) return null;
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

/** Aligns with Rust `parse_swap2_from_data` (full 180-byte EvtSwap2 layout). */
export function parseSwap2FromData(data: Uint8Array, meta: EventMetadata): DexEvent | null {
  let o = 0;
  const pool = readPubkey(data, o);
  if (!pool) return null;
  o += 32;
  const trade_direction = readU8(data, o);
  if (trade_direction === null) return null;
  o += 1;
  const collect_fee_mode = readU8(data, o);
  if (collect_fee_mode === null) return null;
  o += 1;
  const has_referral = readBool(data, o);
  if (has_referral === null) return null;
  o += 1;
  const amount_0 = bn64(readU64LE(data, o));
  o += 8;
  const amount_1 = bn64(readU64LE(data, o));
  o += 8;
  const swap_mode = readU8(data, o);
  if (swap_mode === null) return null;
  o += 1;
  const included_fee_input_amount = bn64(readU64LE(data, o));
  o += 8;
  const excluded_fee_input_amount = bn64(readU64LE(data, o));
  o += 8;
  const amount_left = bn64(readU64LE(data, o));
  o += 8;
  const output_amount = bn64(readU64LE(data, o));
  o += 8;
  const next_sqrt_price = readU128LE(data, o);
  if (next_sqrt_price === null) return null;
  o += 16;
  const claiming_or_trading_fee = bn64(readU64LE(data, o));
  o += 8;
  const protocol_fee = bn64(readU64LE(data, o));
  o += 8;
  const compounding_or_partner_fee = bn64(readU64LE(data, o));
  o += 8;
  const referral_fee = bn64(readU64LE(data, o));
  o += 8;
  const included_transfer_fee_amount_in = bn64(readU64LE(data, o));
  o += 8;
  const included_transfer_fee_amount_out = bn64(readU64LE(data, o));
  o += 8;
  const excluded_transfer_fee_amount_out = bn64(readU64LE(data, o));
  o += 8;
  const current_timestamp = bn64(readU64LE(data, o));
  o += 8;
  const reserve_a_amount = bn64(readU64LE(data, o));
  o += 8;
  const reserve_b_amount = bn64(readU64LE(data, o));

  // ExactIn (0) / PartialFill (1): amount_0=in, amount_1=min_out.
  // ExactOut (2): amount_0=out, amount_1=max_in.
  let amount_in: bigint;
  let minimum_amount_out: bigint;
  if (swap_mode === 0 || swap_mode === 1) {
    amount_in = amount_0;
    minimum_amount_out = amount_1;
  } else if (swap_mode === 2) {
    amount_in = amount_1;
    minimum_amount_out = amount_0;
  } else {
    return null;
  }

  let lp_fee: bigint;
  let partner_fee: bigint;
  let claiming_fee: bigint;
  let compounding_fee: bigint;
  if (usesCompoundingFeeLayout(meta.slot)) {
    lp_fee = claiming_or_trading_fee + compounding_or_partner_fee;
    partner_fee = compounding_or_partner_fee;
    claiming_fee = claiming_or_trading_fee;
    compounding_fee = compounding_or_partner_fee;
  } else {
    lp_fee = claiming_or_trading_fee;
    partner_fee = compounding_or_partner_fee;
    claiming_fee = 0n;
    compounding_fee = 0n;
  }

  const ev: MeteoraDammV2SwapEvent = {
    metadata: meta,
    pool,
    trade_direction,
    collect_fee_mode,
    has_referral,
    amount_0,
    amount_1,
    swap_mode,
    amount_in,
    minimum_amount_out,
    output_amount,
    next_sqrt_price,
    lp_fee,
    protocol_fee,
    partner_fee,
    referral_fee,
    actual_amount_in: included_fee_input_amount,
    excluded_fee_input_amount,
    amount_left,
    claiming_fee,
    compounding_fee,
    included_transfer_fee_amount_in,
    included_transfer_fee_amount_out,
    excluded_transfer_fee_amount_out,
    current_timestamp,
    reserve_a_amount,
    reserve_b_amount,
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

export function parseAddLiquidityFromData(data: Uint8Array, meta: EventMetadata): DexEvent | null {
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

export function parseRemoveLiquidityFromData(data: Uint8Array, meta: EventMetadata): DexEvent | null {
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

/** Parse current `EvtLiquidityChange`; `change_type` 0 = add, 1 = remove. */
export function parseLiquidityChangeFromData(data: Uint8Array, meta: EventMetadata): DexEvent | null {
  const LEN = 177;
  if (data.length < LEN) return null;
  const pool = readPubkey(data, 0);
  const position = readPubkey(data, 32);
  const owner = readPubkey(data, 64);
  if (!pool || !position || !owner) return null;
  const token_a_amount = bn64(readU64LE(data, 96));
  const token_b_amount = bn64(readU64LE(data, 104));
  const total_amount_a = bn64(readU64LE(data, 112));
  const total_amount_b = bn64(readU64LE(data, 120));
  const reserve_a_amount = bn64(readU64LE(data, 128));
  const reserve_b_amount = bn64(readU64LE(data, 136));
  const liquidity_delta = readU128LE(data, 144);
  if (liquidity_delta === null) return null;
  const token_a_amount_threshold = bn64(readU64LE(data, 160));
  const token_b_amount_threshold = bn64(readU64LE(data, 168));
  const change_type = readU8(data, 176);
  if (change_type === 0) {
    const ev: MeteoraDammV2AddLiquidityEvent = {
      metadata: meta,
      pool,
      position,
      owner,
      token_a_amount,
      token_b_amount,
      liquidity_delta,
      token_a_amount_threshold,
      token_b_amount_threshold,
      total_amount_a,
      total_amount_b,
      reserve_a_amount,
      reserve_b_amount,
    };
    return { MeteoraDammV2AddLiquidity: ev };
  }
  if (change_type === 1) {
    const ev: MeteoraDammV2RemoveLiquidityEvent = {
      metadata: meta,
      pool,
      position,
      owner,
      token_a_amount,
      token_b_amount,
      liquidity_delta,
      token_a_amount_threshold,
      token_b_amount_threshold,
      total_amount_a,
      total_amount_b,
      reserve_a_amount,
      reserve_b_amount,
    };
    return { MeteoraDammV2RemoveLiquidity: ev };
  }
  return null;
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

export function parseUpdateDelegatePermissionFromData(
  data: Uint8Array,
  meta: EventMetadata
): DexEvent | null {
  let o = 0;
  const position = readPubkey(data, o);
  if (!position) return null;
  o += 32;
  const owner = readPubkey(data, o);
  if (!owner) return null;
  o += 32;
  const permission = readU32LE(data, o);
  if (permission === null) return null;
  o += 4;
  const has_delegate = readBool(data, o);
  if (has_delegate === null) return null;
  o += 1;
  let delegate: string | null = null;
  if (has_delegate) {
    delegate = readPubkey(data, o);
    if (!delegate) return null;
  }
  const ev: MeteoraDammV2UpdateDelegatePermissionEvent = {
    metadata: meta,
    position,
    owner,
    permission,
    delegate,
  };
  return { MeteoraDammV2UpdateDelegatePermission: ev };
}

export function parseWithdrawDeadLiquidityRewardFromData(
  data: Uint8Array,
  meta: EventMetadata
): DexEvent | null {
  let o = 0;
  const pool = readPubkey(data, o);
  if (!pool) return null;
  o += 32;
  const reward_mint = readPubkey(data, o);
  if (!reward_mint) return null;
  o += 32;
  const amount = readU64LE(data, o);
  if (amount === null) return null;
  const ev: MeteoraDammV2WithdrawDeadLiquidityRewardEvent = {
    metadata: meta,
    pool,
    reward_mint,
    amount,
  };
  return { MeteoraDammV2WithdrawDeadLiquidityReward: ev };
}

function parseDynamicFeeParameters(
  data: Uint8Array,
  offset: number
): { params: MeteoraDammV2DynamicFeeParameters; next: number } | null {
  let o = offset;
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
    params: {
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

export function parseCreateConfigFromData(data: Uint8Array, meta: EventMetadata): DexEvent | null {
  let o = 0;
  if (data.length < o + 27) return null;
  const base_fee_data = Array.from(data.subarray(o, o + 27));
  o += 27;
  const compounding_fee_bps = readU16LE(data, o);
  if (compounding_fee_bps === null) return null;
  o += 2;
  const padding = readU8(data, o);
  if (padding === null) return null;
  o += 1;
  const has_dynamic_fee = readBool(data, o);
  if (has_dynamic_fee === null) return null;
  o += 1;
  let dynamic_fee: MeteoraDammV2DynamicFeeParameters | null = null;
  if (has_dynamic_fee) {
    const parsed = parseDynamicFeeParameters(data, o);
    if (!parsed) return null;
    dynamic_fee = parsed.params;
    o = parsed.next;
  }
  const vault_config_key = readPubkey(data, o);
  if (!vault_config_key) return null;
  o += 32;
  const pool_creator_authority = readPubkey(data, o);
  if (!pool_creator_authority) return null;
  o += 32;
  const activation_type = readU8(data, o);
  if (activation_type === null) return null;
  o += 1;
  const sqrt_min_price = readU128LE(data, o);
  if (sqrt_min_price === null) return null;
  o += 16;
  const sqrt_max_price = readU128LE(data, o);
  if (sqrt_max_price === null) return null;
  o += 16;
  const collect_fee_mode = readU8(data, o);
  if (collect_fee_mode === null) return null;
  o += 1;
  const index = readU64LE(data, o);
  if (index === null) return null;
  o += 8;
  const config = readPubkey(data, o);
  if (!config) return null;
  o += 32;
  const permission = readU128LE(data, o);
  if (permission === null) return null;
  const ev: MeteoraDammV2CreateConfigEvent = {
    metadata: meta,
    base_fee_data,
    compounding_fee_bps,
    padding,
    dynamic_fee,
    vault_config_key,
    pool_creator_authority,
    activation_type,
    sqrt_min_price,
    sqrt_max_price,
    collect_fee_mode,
    index,
    config,
    permission,
  };
  return { MeteoraDammV2CreateConfig: ev };
}

export function parseCreateDynamicConfigFromData(
  data: Uint8Array,
  meta: EventMetadata
): DexEvent | null {
  let o = 0;
  const config = readPubkey(data, o);
  if (!config) return null;
  o += 32;
  const pool_creator_authority = readPubkey(data, o);
  if (!pool_creator_authority) return null;
  o += 32;
  const index = readU64LE(data, o);
  if (index === null) return null;
  o += 8;
  const permission = readU128LE(data, o);
  if (permission === null) return null;
  const ev: MeteoraDammV2CreateDynamicConfigEvent = {
    metadata: meta,
    config,
    pool_creator_authority,
    index,
    permission,
  };
  return { MeteoraDammV2CreateDynamicConfig: ev };
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
  if (disc === SWAP2) return parseSwap2FromData(data, meta);
  if (disc === ADD_LIQUIDITY) return parseAddLiquidityFromData(data, meta);
  if (disc === REMOVE_LIQUIDITY) return parseRemoveLiquidityFromData(data, meta);
  if (disc === LIQUIDITY_CHANGE) return parseLiquidityChangeFromData(data, meta);
  if (disc === INITIALIZE_POOL) return parseInitializePoolEvent(data, meta);
  if (disc === CREATE_POSITION) return parseCreatePositionEvent(data, meta);
  if (disc === CLOSE_POSITION) return parseClosePositionEvent(data, meta);
  if (disc === UPDATE_DELEGATE_PERMISSION) return parseUpdateDelegatePermissionFromData(data, meta);
  if (disc === WITHDRAW_DEAD_LIQUIDITY_REWARD) {
    return parseWithdrawDeadLiquidityRewardFromData(data, meta);
  }
  if (disc === CREATE_CONFIG) return parseCreateConfigFromData(data, meta);
  if (disc === CREATE_DYNAMIC_CONFIG) return parseCreateDynamicConfigFromData(data, meta);
  return null;
}
