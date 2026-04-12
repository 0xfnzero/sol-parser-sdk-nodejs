/**
 * Raydium CLMM 指令解析（与 Orca Whirlpool 同源 Anchor 布局：swap / 增减流动性）
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
  CREATE_POOL: PROGRAM_LOG_DISC.RAYDIUM_CLMM_CREATE_POOL,
};

function discEq(data: Uint8Array, disc: bigint): boolean {
  if (data.length < 8) return false;
  const v = readU64LE(data, 0);
  return v === disc;
}

/** Whirlpool 系 swap 指令账户：0 program, 1 authority, 2 pool, 3 user_ata_a, 4 vault_a, 5 user_ata_b, … */
const SWAP_ACC = {
  POOL: 2,
  SENDER: 1,
  TOKEN_A_USER: 3,
  TOKEN_B_USER: 5,
} as const;

export function parseRaydiumClmmInstruction(
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
    // Anchor swap：amount, other_amount_threshold, sqrt_price_limit(u128), amount_specified_is_input, a_to_b
    if (instructionData.length < 42) return null;
    const amount = readU64LE(instructionData, 8) ?? 0n;
    const other = readU64LE(instructionData, 16) ?? 0n;
    const sqrt_limit = readU128LE(instructionData, 24) ?? 0n;
    const _amount_specified_is_input = readBool(instructionData, 40);
    const a_to_b = readBool(instructionData, 41);
    if (_amount_specified_is_input === null || a_to_b === null) return null;
    return {
      RaydiumClmmSwap: {
        metadata: meta,
        pool_state: getAccount(accounts, SWAP_ACC.POOL) ?? Z,
        sender: getAccount(accounts, SWAP_ACC.SENDER) ?? Z,
        token_account_0: getAccount(accounts, SWAP_ACC.TOKEN_A_USER) ?? Z,
        token_account_1: getAccount(accounts, SWAP_ACC.TOKEN_B_USER) ?? Z,
        amount_0: amount,
        amount_1: other,
        zero_for_one: a_to_b,
        sqrt_price_x64: sqrt_limit,
        liquidity: 0n,
        transfer_fee_0: 0n,
        transfer_fee_1: 0n,
        tick: 0,
      },
    };
  }

  if (discEq(instructionData, DISC.INCREASE_LIQUIDITY)) {
    // increase_liquidity_v2：liquidity (u128), token_max_a, token_max_b
    if (instructionData.length < 8 + 16 + 8 + 8) return null;
    const liquidity = readU128LE(instructionData, 8) ?? 0n;
    const amount0_max = readU64LE(instructionData, 24) ?? 0n;
    const amount1_max = readU64LE(instructionData, 32) ?? 0n;
    return {
      RaydiumClmmIncreaseLiquidity: {
        metadata: meta,
        pool: getAccount(accounts, 2) ?? Z,
        position_nft_mint: getAccount(accounts, 3) ?? Z,
        user: getAccount(accounts, 0) ?? Z,
        liquidity,
        amount0_max,
        amount1_max,
      },
    };
  }

  if (discEq(instructionData, DISC.DECREASE_LIQUIDITY)) {
    // decrease_liquidity：liquidity (u128), token_min_a, token_min_b
    if (instructionData.length < 8 + 16 + 8 + 8) return null;
    const liquidity = readU128LE(instructionData, 8) ?? 0n;
    const amount0_min = readU64LE(instructionData, 24) ?? 0n;
    const amount1_min = readU64LE(instructionData, 32) ?? 0n;
    return {
      RaydiumClmmDecreaseLiquidity: {
        metadata: meta,
        pool: getAccount(accounts, 2) ?? Z,
        position_nft_mint: getAccount(accounts, 3) ?? Z,
        user: getAccount(accounts, 0) ?? Z,
        liquidity,
        amount0_min,
        amount1_min,
      },
    };
  }

  if (discEq(instructionData, DISC.CREATE_POOL)) {
    if (instructionData.length < 8 + 16 + 8) return null;
    const sqrt_price_x64 = readU128LE(instructionData, 8) ?? 0n;
    const open_time = readU64LE(instructionData, 24) ?? 0n;
    return {
      RaydiumClmmCreatePool: {
        metadata: meta,
        pool: getAccount(accounts, 4) ?? Z,
        token_0_mint: Z,
        token_1_mint: Z,
        tick_spacing: 0,
        fee_rate: 0,
        creator: getAccount(accounts, 0) ?? Z,
        sqrt_price_x64,
        open_time,
      },
    };
  }

  return null;
}
