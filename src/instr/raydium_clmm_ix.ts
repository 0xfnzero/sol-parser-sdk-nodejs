/**
 * Raydium CLMM 指令解析（与 Orca Whirlpool 同源 Anchor 布局：swap / 增减流动性）
 */
import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { u64leDiscriminator } from "../logs/program_log_discriminators.js";
import { readU128LE } from "../util/binary.js";
import { getAccount, ixMeta, readBool, readI32LE, readU64LE } from "./utils.js";

const Z = defaultPubkey();

const DISC = {
  SWAP: u64leDiscriminator([248, 198, 158, 145, 225, 117, 135, 200]),
  SWAP_V2: u64leDiscriminator([43, 4, 237, 11, 26, 201, 30, 98]),
  INCREASE_LIQUIDITY_V2: u64leDiscriminator([133, 29, 89, 223, 69, 238, 176, 10]),
  DECREASE_LIQUIDITY_V2: u64leDiscriminator([58, 127, 188, 62, 79, 82, 196, 96]),
  CREATE_POOL: u64leDiscriminator([233, 146, 209, 142, 207, 104, 64, 188]),
  CREATE_CUSTOMIZABLE_POOL: u64leDiscriminator([43, 68, 212, 167, 89, 47, 164, 1]),
  OPEN_POSITION: u64leDiscriminator([135, 128, 47, 77, 15, 152, 240, 49]),
  OPEN_POSITION_V2: u64leDiscriminator([77, 184, 74, 214, 112, 86, 241, 199]),
  OPEN_POSITION_WITH_TOKEN_22_NFT: u64leDiscriminator([77, 255, 174, 82, 125, 29, 201, 46]),
  CLOSE_POSITION: u64leDiscriminator([123, 134, 81, 0, 49, 68, 98, 98]),
};

function discEq(data: Uint8Array, disc: bigint): boolean {
  if (data.length < 8) return false;
  const v = readU64LE(data, 0);
  return v === disc;
}

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

  if (discEq(instructionData, DISC.SWAP) || discEq(instructionData, DISC.SWAP_V2)) {
    if (instructionData.length < 8 + 8 + 8 + 16 + 1) return null;
    const sqrt_limit = readU128LE(instructionData, 24) ?? 0n;
    const is_base_input = readBool(instructionData, 40);
    if (is_base_input === null) return null;
    return {
      RaydiumClmmSwap: {
        metadata: meta,
        pool_state: getAccount(accounts, 2) ?? Z,
        sender: getAccount(accounts, 0) ?? Z,
        token_account_0: getAccount(accounts, 3) ?? Z,
        token_account_1: getAccount(accounts, 4) ?? Z,
        amount_0: 0n,
        amount_1: 0n,
        zero_for_one: is_base_input,
        sqrt_price_x64: sqrt_limit,
        liquidity: 0n,
        transfer_fee_0: 0n,
        transfer_fee_1: 0n,
        tick: 0,
      },
    };
  }

  if (discEq(instructionData, DISC.INCREASE_LIQUIDITY_V2)) {
    if (instructionData.length < 8 + 16 + 8 + 8) return null;
    const liquidity = readU128LE(instructionData, 8) ?? 0n;
    const amount0_max = readU64LE(instructionData, 24) ?? 0n;
    const amount1_max = readU64LE(instructionData, 32) ?? 0n;
    return {
      RaydiumClmmIncreaseLiquidity: {
        metadata: meta,
        pool: getAccount(accounts, 2) ?? Z,
        position_nft_mint: getAccount(accounts, 1) ?? Z,
        user: getAccount(accounts, 0) ?? Z,
        liquidity,
        amount_0: 0n,
        amount_1: 0n,
        amount_0_transfer_fee: 0n,
        amount_1_transfer_fee: 0n,
        amount0_max,
        amount1_max,
      },
    };
  }

  if (discEq(instructionData, DISC.DECREASE_LIQUIDITY_V2)) {
    if (instructionData.length < 8 + 16 + 8 + 8) return null;
    const liquidity = readU128LE(instructionData, 8) ?? 0n;
    const amount0_min = readU64LE(instructionData, 24) ?? 0n;
    const amount1_min = readU64LE(instructionData, 32) ?? 0n;
    return {
      RaydiumClmmDecreaseLiquidity: {
        metadata: meta,
        pool: getAccount(accounts, 3) ?? Z,
        position_nft_mint: getAccount(accounts, 1) ?? Z,
        user: getAccount(accounts, 0) ?? Z,
        liquidity,
        decrease_amount_0: 0n,
        decrease_amount_1: 0n,
        fee_amount_0: 0n,
        fee_amount_1: 0n,
        reward_amounts: [0n, 0n, 0n],
        transfer_fee_0: 0n,
        transfer_fee_1: 0n,
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
        pool: getAccount(accounts, 2) ?? Z,
        token_0_mint: getAccount(accounts, 3) ?? Z,
        token_1_mint: getAccount(accounts, 4) ?? Z,
        tick_spacing: 0,
        fee_rate: 0,
        creator: getAccount(accounts, 0) ?? Z,
        sqrt_price_x64,
        tick: 0,
        token_vault_0: getAccount(accounts, 5) ?? Z,
        token_vault_1: getAccount(accounts, 6) ?? Z,
        open_time,
      },
    };
  }

  if (discEq(instructionData, DISC.CREATE_CUSTOMIZABLE_POOL)) {
    if (instructionData.length < 8 + 16) return null;
    const sqrt_price_x64 = readU128LE(instructionData, 8) ?? 0n;
    return {
      RaydiumClmmCreatePool: {
        metadata: meta,
        pool: getAccount(accounts, 2) ?? Z,
        token_0_mint: getAccount(accounts, 3) ?? Z,
        token_1_mint: getAccount(accounts, 4) ?? Z,
        tick_spacing: 0,
        fee_rate: 0,
        creator: getAccount(accounts, 0) ?? Z,
        sqrt_price_x64,
        tick: 0,
        token_vault_0: getAccount(accounts, 5) ?? Z,
        token_vault_1: getAccount(accounts, 6) ?? Z,
        open_time: 0n,
      },
    };
  }

  if (discEq(instructionData, DISC.OPEN_POSITION)) {
    return parseOpenPosition(instructionData, accounts, meta, 5);
  }

  if (discEq(instructionData, DISC.OPEN_POSITION_V2) || discEq(instructionData, DISC.OPEN_POSITION_WITH_TOKEN_22_NFT)) {
    const poolIndex = discEq(instructionData, DISC.OPEN_POSITION_WITH_TOKEN_22_NFT) ? 4 : 5;
    return parseOpenPosition(instructionData, accounts, meta, poolIndex);
  }

  if (discEq(instructionData, DISC.CLOSE_POSITION)) {
    return {
      RaydiumClmmClosePosition: {
        metadata: meta,
        pool: Z,
        user: getAccount(accounts, 0) ?? Z,
        position_nft_mint: getAccount(accounts, 1) ?? Z,
      },
    };
  }

  return null;
}

function parseOpenPosition(
  instructionData: Uint8Array,
  accounts: string[],
  metadata: ReturnType<typeof ixMeta>,
  poolIndex: number
): DexEvent | null {
  if (instructionData.length < 8 + 4 + 4 + 4 + 4 + 16 + 8 + 8) return null;
  const tick_lower_index = readI32LE(instructionData, 8);
  const tick_upper_index = readI32LE(instructionData, 12);
  const liquidity = readU128LE(instructionData, 24) ?? 0n;
  if (tick_lower_index === null || tick_upper_index === null) return null;
  return {
    RaydiumClmmOpenPosition: {
      metadata,
      pool: getAccount(accounts, poolIndex) ?? Z,
      user: getAccount(accounts, 1) ?? Z,
      position_nft_mint: getAccount(accounts, 2) ?? Z,
      tick_lower_index,
      tick_upper_index,
      liquidity,
    },
  };
}
