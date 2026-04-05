/**
 * Raydium CPMM 指令解析
 */
import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { getAccount, ixMeta, readU64LE } from "./utils.js";

const Z = defaultPubkey();

// Discriminators (little-endian u64)
const DISC = {
  SWAP: 16066630856980634287n,    // disc8(143, 190, 90, 218, 196, 30, 51, 222)
  DEPOSIT: 13142033090605164850n, // disc8(242, 35, 198, 137, 82, 225, 242, 182)
  WITHDRAW: 2464928621593348407n, // disc8(183, 18, 70, 156, 148, 109, 161, 34)
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

  if (discEq(instructionData, DISC.SWAP)) {
    return {
      RaydiumCpmmSwap: {
        metadata: meta,
        pool_id: getAccount(accounts, 2) ?? Z,
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

  if (discEq(instructionData, DISC.DEPOSIT)) {
    return {
      RaydiumCpmmDeposit: {
        metadata: meta,
        pool: getAccount(accounts, 2) ?? Z,
        user: getAccount(accounts, 0) ?? Z,
        lp_token_amount: 0n,
        token0_amount: 0n,
        token1_amount: 0n,
      },
    };
  }

  if (discEq(instructionData, DISC.WITHDRAW)) {
    return {
      RaydiumCpmmWithdraw: {
        metadata: meta,
        pool: getAccount(accounts, 2) ?? Z,
        user: getAccount(accounts, 0) ?? Z,
        lp_token_amount: 0n,
        token0_amount: 0n,
        token1_amount: 0n,
      },
    };
  }

  return null;
}
