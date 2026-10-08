/**
 * Raydium CPMM 指令解析（Anchor：8 字节 discriminator + Borsh 参数）
 */
import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { PROGRAM_LOG_DISC, u64leDiscriminator } from "../logs/program_log_discriminators.js";
import { getAccount, ixMeta, readU64LE } from "./utils.js";

const Z = defaultPubkey();

const DISC = {
  SWAP_BASE_IN: PROGRAM_LOG_DISC.RAYDIUM_CPMM_SWAP_BASE_IN,
  SWAP_BASE_OUT: PROGRAM_LOG_DISC.RAYDIUM_CPMM_SWAP_BASE_OUT,
  INITIALIZE_PERMISSION: u64leDiscriminator([63, 55, 254, 65, 49, 178, 89, 121]),
  INITIALIZE: u64leDiscriminator([175, 175, 109, 31, 13, 152, 155, 237]),
  DEPOSIT: PROGRAM_LOG_DISC.RAYDIUM_CPMM_DEPOSIT,
  WITHDRAW: PROGRAM_LOG_DISC.RAYDIUM_CPMM_WITHDRAW,
};

function discEq(data: Uint8Array, disc: bigint): boolean {
  if (data.length < 8) return false;
  const v = readU64LE(data, 0);
  return v === disc;
}

export function parseRaydiumCpmmInstruction(
  instructionData: Uint8Array,
  accounts: string[],
  signature: string,
  slot: number | bigint | string,
  txIndex: number | bigint | string,
  blockTimeUs: number | bigint | string | undefined,
  grpcRecvUs: number | bigint | string
): DexEvent | null {
  if (instructionData.length < 8) return null;
  const meta = ixMeta(signature, slot, txIndex, blockTimeUs, grpcRecvUs);

  if (discEq(instructionData, DISC.SWAP_BASE_IN)) {
    if (instructionData.length < 8 + 8 + 8) return null;
    return {
      RaydiumCpmmSwap: {
        metadata: meta,
        pool_id: getAccount(accounts, 3) ?? Z,
        input_amount: 0n,
        output_amount: 0n,
        input_vault_before: 0n,
        output_vault_before: 0n,
        input_transfer_fee: 0n,
        output_transfer_fee: 0n,
        base_input: true,
      },
    };
  }

  if (discEq(instructionData, DISC.SWAP_BASE_OUT)) {
    if (instructionData.length < 8 + 8 + 8) return null;
    return {
      RaydiumCpmmSwap: {
        metadata: meta,
        pool_id: getAccount(accounts, 3) ?? Z,
        input_amount: 0n,
        output_amount: 0n,
        input_vault_before: 0n,
        output_vault_before: 0n,
        input_transfer_fee: 0n,
        output_transfer_fee: 0n,
        base_input: false,
      },
    };
  }

  if (discEq(instructionData, DISC.INITIALIZE) || discEq(instructionData, DISC.INITIALIZE_PERMISSION)) {
    const permission = discEq(instructionData, DISC.INITIALIZE_PERMISSION);
    if (instructionData.length < (permission ? 33 : 32) || accounts.length < (permission ? 21 : 20)) return null;
    const init_amount0 = readU64LE(instructionData, 8) ?? 0n;
    const init_amount1 = readU64LE(instructionData, 16) ?? 0n;
    return {
      RaydiumCpmmInitialize: {
        metadata: meta,
        pool: getAccount(accounts, permission ? 4 : 3) ?? Z,
        creator: getAccount(accounts, permission ? 1 : 0) ?? Z,
        init_amount0,
        init_amount1,
      },
    };
  }

  // Instruction token amounts are deposit maxima / withdrawal minima, not executed fills.
  if (discEq(instructionData, DISC.DEPOSIT)) {
    if (instructionData.length < 8 + 8 + 8 + 8) return null;
    const lp_token_amount = readU64LE(instructionData, 8) ?? 0n;
    const token0_amount = readU64LE(instructionData, 16) ?? 0n;
    const token1_amount = readU64LE(instructionData, 24) ?? 0n;
    return {
      RaydiumCpmmDeposit: {
        metadata: meta,
        pool: getAccount(accounts, 2) ?? Z,
        user: getAccount(accounts, 0) ?? Z,
        lp_token_amount,
        token0_amount,
        token1_amount,
      },
    };
  }

  if (discEq(instructionData, DISC.WITHDRAW)) {
    if (instructionData.length < 8 + 8 + 8 + 8) return null;
    const lp_token_amount = readU64LE(instructionData, 8) ?? 0n;
    const token0_amount = readU64LE(instructionData, 16) ?? 0n;
    const token1_amount = readU64LE(instructionData, 24) ?? 0n;
    return {
      RaydiumCpmmWithdraw: {
        metadata: meta,
        pool: getAccount(accounts, 2) ?? Z,
        user: getAccount(accounts, 0) ?? Z,
        lp_token_amount,
        token0_amount,
        token1_amount,
      },
    };
  }

  return null;
}
