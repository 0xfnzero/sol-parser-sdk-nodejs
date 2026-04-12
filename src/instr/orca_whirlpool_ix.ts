/**
 * Orca Whirlpool 指令解析（Anchor swap / 增减流动性）
 *
 * 注意：链上指令 discriminator 与 `emit!` 的 Program data 日志 discriminator 不同；
 * Whirlpool 的 `swap` / `increase_liquidity_v2` / `decrease_liquidity` 与 Raydium CLMM 同源，复用同一组 Anchor 前 8 字节。
 */
import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { PROGRAM_LOG_DISC } from "../logs/program_log_discriminators.js";
import { getAccount, ixMeta, readBool, readU64LE, readU128LE } from "./utils.js";

const Z = defaultPubkey();

const DISC = {
  SWAP: PROGRAM_LOG_DISC.RAYDIUM_CLMM_SWAP,
  INCREASE_LIQUIDITY: PROGRAM_LOG_DISC.RAYDIUM_CLMM_INCREASE_LIQUIDITY,
  DECREASE_LIQUIDITY: PROGRAM_LOG_DISC.RAYDIUM_CLMM_DECREASE_LIQUIDITY,
};

function discEq(data: Uint8Array, disc: bigint): boolean {
  if (data.length < 8) return false;
  const v = readU64LE(data, 0);
  return v === disc;
}

const SWAP_ACC = {
  WHIRLPOOL: 2,
  SENDER: 1,
  TOKEN_A_USER: 3,
  TOKEN_B_USER: 5,
} as const;

export function parseOrcaWhirlpoolInstruction(
  instructionData: Uint8Array,
  accounts: string[],
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number
): DexEvent | null {
  if (instructionData.length < 8) return null;
  const meta = ixMeta(signature, slot, txIndex, blockTimeUs, grpcRecvUs);

  if (discEq(instructionData, DISC.SWAP)) {
    if (instructionData.length < 42) return null;
    const amount = readU64LE(instructionData, 8) ?? 0n;
    const other_threshold = readU64LE(instructionData, 16) ?? 0n;
    const sqrt_price_limit = readU128LE(instructionData, 24) ?? 0n;
    const amount_specified_is_input = readBool(instructionData, 40);
    const a_to_b = readBool(instructionData, 41);
    if (amount_specified_is_input === null || a_to_b === null) return null;
    const input_amount = amount_specified_is_input ? amount : other_threshold;
    const output_amount = amount_specified_is_input ? other_threshold : amount;
    return {
      OrcaWhirlpoolSwap: {
        metadata: meta,
        whirlpool: getAccount(accounts, SWAP_ACC.WHIRLPOOL) ?? Z,
        a_to_b,
        pre_sqrt_price: 0n,
        post_sqrt_price: 0n,
        input_amount,
        output_amount,
        input_transfer_fee: 0n,
        output_transfer_fee: 0n,
        lp_fee: 0n,
        protocol_fee: 0n,
      },
    };
  }

  if (discEq(instructionData, DISC.INCREASE_LIQUIDITY)) {
    // increase_liquidity_v2：liquidity_amount (u128), token_max_a, token_max_b
    if (instructionData.length < 8 + 16 + 8 + 8) return null;
    const liquidity = readU128LE(instructionData, 8) ?? 0n;
    const token_max_a = readU64LE(instructionData, 24) ?? 0n;
    const token_max_b = readU64LE(instructionData, 32) ?? 0n;
    return {
      OrcaWhirlpoolLiquidityIncreased: {
        metadata: meta,
        whirlpool: getAccount(accounts, 2) ?? Z,
        position: getAccount(accounts, 3) ?? Z,
        tick_lower_index: 0,
        tick_upper_index: 0,
        liquidity,
        token_a_amount: token_max_a,
        token_b_amount: token_max_b,
        token_a_transfer_fee: 0n,
        token_b_transfer_fee: 0n,
      },
    };
  }

  if (discEq(instructionData, DISC.DECREASE_LIQUIDITY)) {
    // decrease_liquidity：liquidity_amount (u128), token_min_a, token_min_b
    if (instructionData.length < 8 + 16 + 8 + 8) return null;
    const liquidity = readU128LE(instructionData, 8) ?? 0n;
    const token_min_a = readU64LE(instructionData, 24) ?? 0n;
    const token_min_b = readU64LE(instructionData, 32) ?? 0n;
    return {
      OrcaWhirlpoolLiquidityDecreased: {
        metadata: meta,
        whirlpool: getAccount(accounts, 2) ?? Z,
        position: getAccount(accounts, 3) ?? Z,
        tick_lower_index: 0,
        tick_upper_index: 0,
        liquidity,
        token_a_amount: token_min_a,
        token_b_amount: token_min_b,
        token_a_transfer_fee: 0n,
        token_b_transfer_fee: 0n,
      },
    };
  }

  return null;
}
