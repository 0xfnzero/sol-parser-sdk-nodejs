/**
 * Raydium CPMM 指令解析（Anchor：8 字节 discriminator + Borsh 参数）
 */
import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { PROGRAM_LOG_DISC } from "../logs/program_log_discriminators.js";
import { getAccount, ixMeta, readU64LE } from "./utils.js";

const Z = defaultPubkey();

const DISC = {
  SWAP_BASE_IN: PROGRAM_LOG_DISC.RAYDIUM_CPMM_SWAP_BASE_IN,
  SWAP_BASE_OUT: PROGRAM_LOG_DISC.RAYDIUM_CPMM_SWAP_BASE_OUT,
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
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number
): DexEvent | null {
  if (instructionData.length < 8) return null;
  const meta = ixMeta(signature, slot, txIndex, blockTimeUs, grpcRecvUs);

  if (discEq(instructionData, DISC.SWAP_BASE_IN)) {
    if (instructionData.length < 8 + 8 + 8) return null;
    const amount_in = readU64LE(instructionData, 8) ?? 0n;
    const minimum_amount_out = readU64LE(instructionData, 16) ?? 0n;
    return {
      RaydiumCpmmSwap: {
        metadata: meta,
        pool_id: getAccount(accounts, 2) ?? Z,
        input_amount: amount_in,
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
    const max_amount_in = readU64LE(instructionData, 8) ?? 0n;
    const amount_out = readU64LE(instructionData, 16) ?? 0n;
    return {
      RaydiumCpmmSwap: {
        metadata: meta,
        pool_id: getAccount(accounts, 2) ?? Z,
        input_amount: max_amount_in,
        output_amount: amount_out,
        input_vault_before: 0n,
        output_vault_before: 0n,
        input_transfer_fee: 0n,
        output_transfer_fee: 0n,
        base_input: false,
      },
    };
  }

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
