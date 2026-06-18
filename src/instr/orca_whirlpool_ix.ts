/**
 * Orca Whirlpool 指令解析（Anchor swap / 增减流动性）
 *
 * 注意：链上指令 discriminator 与 `emit!` 的 Program data 日志 discriminator 不同；
 * Whirlpool 的 `swap` / `increase_liquidity_v2` / `decrease_liquidity` 与 Raydium CLMM 同源，复用同一组 Anchor 前 8 字节。
 */
import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { u64leDiscriminator } from "../logs/program_log_discriminators.js";
import { getAccount, ixMeta, readBool, readU16LE, readU64LE, readU128LE } from "./utils.js";

const Z = defaultPubkey();

const DISC = {
  SWAP: u64leDiscriminator([248, 198, 158, 145, 225, 117, 135, 200]),
  SWAP_V2: u64leDiscriminator([43, 4, 237, 11, 26, 201, 30, 98]),
  INCREASE_LIQUIDITY: u64leDiscriminator([46, 156, 243, 118, 13, 205, 251, 178]),
  DECREASE_LIQUIDITY: u64leDiscriminator([160, 38, 208, 111, 104, 91, 44, 1]),
  INITIALIZE_POOL: u64leDiscriminator([17, 43, 80, 74, 168, 202, 6, 113]),
};

function discEq(data: Uint8Array, disc: bigint): boolean {
  if (data.length < 8) return false;
  const v = readU64LE(data, 0);
  return v === disc;
}

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

  if (discEq(instructionData, DISC.SWAP) || discEq(instructionData, DISC.SWAP_V2)) {
    if (instructionData.length < 42) return null;
    const amount = readU64LE(instructionData, 8) ?? 0n;
    const other_threshold = readU64LE(instructionData, 16) ?? 0n;
    const sqrt_price_limit = readU128LE(instructionData, 24) ?? 0n;
    const amount_specified_is_input = readBool(instructionData, 40);
    const a_to_b = readBool(instructionData, 41);
    if (amount_specified_is_input === null || a_to_b === null) return null;
    const input_amount = amount_specified_is_input ? amount : 0n;
    const output_amount = amount_specified_is_input ? other_threshold : amount;
    return {
      OrcaWhirlpoolSwap: {
        metadata: meta,
        whirlpool: getAccount(accounts, 1) ?? Z,
        a_to_b,
        pre_sqrt_price: sqrt_price_limit,
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
        whirlpool: getAccount(accounts, 1) ?? Z,
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
        whirlpool: getAccount(accounts, 1) ?? Z,
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

  if (discEq(instructionData, DISC.INITIALIZE_POOL)) {
    if (instructionData.length < 8 + 2 + 16) return null;
    const tick_spacing = readU16LE(instructionData, 8) ?? 0;
    const initial_sqrt_price = readU128LE(instructionData, 10) ?? 0n;
    return {
      OrcaWhirlpoolPoolInitialized: {
        metadata: meta,
        whirlpool: getAccount(accounts, 1) ?? Z,
        whirlpools_config: getAccount(accounts, 2) ?? Z,
        token_mint_a: getAccount(accounts, 3) ?? Z,
        token_mint_b: getAccount(accounts, 4) ?? Z,
        tick_spacing,
        token_program_a: getAccount(accounts, 8) ?? Z,
        token_program_b: getAccount(accounts, 9) ?? Z,
        decimals_a: 0,
        decimals_b: 0,
        initial_sqrt_price,
      },
    };
  }

  return null;
}
