/**
 * Meteora DAMM V2 指令解析
 * CPI 布局：前 8 字节为外层 Anchor discriminator，8..16 为事件 log discriminator，16.. 为载荷。
 */
import type { DexEvent, MeteoraDammV2SwapEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { parseInitializePoolEvent } from "../logs/meteora_damm.js";
import { ixMeta, readBool, readPubkeyIx, readU128LE, readU64LE, readU8 } from "./utils.js";

const Z = defaultPubkey();

function disc8(a: readonly number[]): Uint8Array {
  return Uint8Array.from(a);
}

const CPI = {
  SWAP_LOG: disc8([27, 60, 21, 213, 138, 170, 187, 147]),
  SWAP2_LOG: disc8([189, 66, 51, 168, 38, 80, 117, 153]),
  CREATE_POSITION_LOG: disc8([156, 15, 119, 198, 29, 181, 221, 55]),
  CLOSE_POSITION_LOG: disc8([20, 145, 144, 68, 143, 142, 214, 178]),
  ADD_LIQUIDITY_LOG: disc8([175, 242, 8, 157, 30, 247, 185, 169]),
  REMOVE_LIQUIDITY_LOG: disc8([87, 46, 88, 98, 175, 96, 34, 91]),
  INITIALIZE_POOL_LOG: disc8([228, 50, 246, 85, 203, 66, 134, 37]),
};

function discEq(h: Uint8Array, d: Uint8Array): boolean {
  for (let i = 0; i < 8; i++) if (h[i] !== d[i]) return false;
  return true;
}

function vaults() {
  return {
    token_a_vault: Z,
    token_b_vault: Z,
    token_a_mint: Z,
    token_b_mint: Z,
    token_a_program: Z,
    token_b_program: Z,
  };
}

function parseSwapCpi(
  data: Uint8Array,
  meta: MeteoraDammV2SwapEvent["metadata"]
): DexEvent | null {
  let o = 0;
  const pool = readPubkeyIx(data, o);
  if (!pool) return null;
  o += 32;
  const trade_direction = readU8(data, o);
  if (trade_direction === null) return null;
  o += 1;
  const has_referral = readBool(data, o);
  if (has_referral === null) return null;
  o += 1;
  const amount_in = readU64LE(data, o);
  if (amount_in === null) return null;
  o += 8;
  const min_out = readU64LE(data, o);
  if (min_out === null) return null;
  o += 8;
  const output_amount = readU64LE(data, o);
  if (output_amount === null) return null;
  o += 8;
  const next_sqrt_price = readU128LE(data, o);
  if (next_sqrt_price === null) return null;
  o += 16;
  const lp_fee = readU64LE(data, o);
  if (lp_fee === null) return null;
  o += 8;
  const protocol_fee = readU64LE(data, o);
  if (protocol_fee === null) return null;
  o += 8;
  const partner_fee = readU64LE(data, o);
  if (partner_fee === null) return null;
  o += 8;
  const referral_fee = readU64LE(data, o);
  if (referral_fee === null) return null;
  o += 8;
  const actual_amount_in = readU64LE(data, o);
  if (actual_amount_in === null) return null;
  o += 8;
  const current_timestamp = readU64LE(data, o);
  if (current_timestamp === null) return null;
  const ev: MeteoraDammV2SwapEvent = {
    metadata: meta,
    pool,
    trade_direction,
    has_referral,
    amount_in,
    minimum_amount_out: min_out,
    output_amount,
    next_sqrt_price,
    lp_fee,
    protocol_fee,
    partner_fee,
    referral_fee,
    actual_amount_in,
    current_timestamp,
    ...vaults(),
  };
  return { MeteoraDammV2Swap: ev };
}

function parseSwap2Cpi(
  data: Uint8Array,
  meta: MeteoraDammV2SwapEvent["metadata"]
): DexEvent | null {
  let o = 0;
  const pool = readPubkeyIx(data, o);
  if (!pool) return null;
  o += 32;
  const trade_direction = readU8(data, o);
  if (trade_direction === null) return null;
  o += 1;
  const _cfm = readU8(data, o);
  if (_cfm === null) return null;
  o += 1;
  const has_referral = readBool(data, o);
  if (has_referral === null) return null;
  o += 1;
  const amount_0 = readU64LE(data, o);
  if (amount_0 === null) return null;
  o += 8;
  const amount_1 = readU64LE(data, o);
  if (amount_1 === null) return null;
  o += 8;
  const swap_mode = readU8(data, o);
  if (swap_mode === null) return null;
  o += 1;
  const included_fee_input_amount = readU64LE(data, o);
  if (included_fee_input_amount === null) return null;
  o += 8;
  o += 8;
  o += 8;
  const output_amount = readU64LE(data, o);
  if (output_amount === null) return null;
  o += 8;
  const next_sqrt_price = readU128LE(data, o);
  if (next_sqrt_price === null) return null;
  o += 16;
  const lp_fee = readU64LE(data, o);
  if (lp_fee === null) return null;
  o += 8;
  const protocol_fee = readU64LE(data, o);
  if (protocol_fee === null) return null;
  o += 8;
  const referral_fee = readU64LE(data, o);
  if (referral_fee === null) return null;
  o += 8;
  o += 8;
  o += 8;
  const current_timestamp = readU64LE(data, o);
  if (current_timestamp === null) return null;
  const [amount_in, minimum_amount_out] =
    swap_mode === 0 ? [amount_0, amount_1] : [amount_1, amount_0];
  const ev: MeteoraDammV2SwapEvent = {
    metadata: meta,
    pool,
    trade_direction,
    has_referral,
    amount_in,
    minimum_amount_out,
    output_amount,
    next_sqrt_price,
    lp_fee,
    protocol_fee,
    partner_fee: 0n,
    referral_fee,
    actual_amount_in: included_fee_input_amount,
    current_timestamp,
    ...vaults(),
  };
  return { MeteoraDammV2Swap: ev };
}

export function parseMeteoraDammInstruction(
  instructionData: Uint8Array,
  _accounts: string[],
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number
): DexEvent | null {
  if (instructionData.length < 16) return null;
  const cpiHead = instructionData.subarray(8, 16);
  const cpiData = instructionData.subarray(16);
  const meta = ixMeta(signature, slot, txIndex, blockTimeUs, grpcRecvUs);

  if (discEq(cpiHead, CPI.SWAP_LOG)) return parseSwapCpi(cpiData, meta);
  if (discEq(cpiHead, CPI.SWAP2_LOG)) return parseSwap2Cpi(cpiData, meta);
  if (discEq(cpiHead, CPI.CREATE_POSITION_LOG)) {
    let o = 0;
    const pool = readPubkeyIx(cpiData, o);
    if (!pool) return null;
    o += 32;
    const owner = readPubkeyIx(cpiData, o);
    if (!owner) return null;
    o += 32;
    const position = readPubkeyIx(cpiData, o);
    if (!position) return null;
    o += 32;
    const position_nft_mint = readPubkeyIx(cpiData, o);
    if (!position_nft_mint) return null;
    return {
      MeteoraDammV2CreatePosition: { metadata: meta, pool, owner, position, position_nft_mint },
    };
  }
  if (discEq(cpiHead, CPI.CLOSE_POSITION_LOG)) {
    let o = 0;
    const pool = readPubkeyIx(cpiData, o);
    if (!pool) return null;
    o += 32;
    const owner = readPubkeyIx(cpiData, o);
    if (!owner) return null;
    o += 32;
    const position = readPubkeyIx(cpiData, o);
    if (!position) return null;
    o += 32;
    const position_nft_mint = readPubkeyIx(cpiData, o);
    if (!position_nft_mint) return null;
    return {
      MeteoraDammV2ClosePosition: { metadata: meta, pool, owner, position, position_nft_mint },
    };
  }
  if (discEq(cpiHead, CPI.ADD_LIQUIDITY_LOG)) {
    let o = 0;
    const pool = readPubkeyIx(cpiData, o);
    if (!pool) return null;
    o += 32;
    const position = readPubkeyIx(cpiData, o);
    if (!position) return null;
    o += 32;
    const owner = readPubkeyIx(cpiData, o);
    if (!owner) return null;
    o += 32;
    const liquidity_delta = readU128LE(cpiData, o);
    if (liquidity_delta === null) return null;
    o += 16;
    const token_a_amount_threshold = readU64LE(cpiData, o);
    if (token_a_amount_threshold === null) return null;
    o += 8;
    const token_b_amount_threshold = readU64LE(cpiData, o);
    if (token_b_amount_threshold === null) return null;
    o += 8;
    const token_a_amount = readU64LE(cpiData, o);
    if (token_a_amount === null) return null;
    o += 8;
    const token_b_amount = readU64LE(cpiData, o);
    if (token_b_amount === null) return null;
    o += 8;
    const total_amount_a = readU64LE(cpiData, o);
    if (total_amount_a === null) return null;
    o += 8;
    const total_amount_b = readU64LE(cpiData, o);
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
  if (discEq(cpiHead, CPI.REMOVE_LIQUIDITY_LOG)) {
    let o = 0;
    const pool = readPubkeyIx(cpiData, o);
    if (!pool) return null;
    o += 32;
    const position = readPubkeyIx(cpiData, o);
    if (!position) return null;
    o += 32;
    const owner = readPubkeyIx(cpiData, o);
    if (!owner) return null;
    o += 32;
    const liquidity_delta = readU128LE(cpiData, o);
    if (liquidity_delta === null) return null;
    o += 16;
    const token_a_amount_threshold = readU64LE(cpiData, o);
    if (token_a_amount_threshold === null) return null;
    o += 8;
    const token_b_amount_threshold = readU64LE(cpiData, o);
    if (token_b_amount_threshold === null) return null;
    o += 8;
    const token_a_amount = readU64LE(cpiData, o);
    if (token_a_amount === null) return null;
    o += 8;
    const token_b_amount = readU64LE(cpiData, o);
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
  if (discEq(cpiHead, CPI.INITIALIZE_POOL_LOG)) {
    return parseInitializePoolEvent(cpiData, meta);
  }
  return null;
}
