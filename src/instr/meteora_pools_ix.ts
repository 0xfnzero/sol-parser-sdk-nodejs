import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { readU64LE, readU8 } from "../util/binary.js";
import { u64leDiscriminator } from "../logs/program_log_discriminators.js";
import { getAccount, ixMeta } from "./utils.js";

const Z = defaultPubkey();

const DISC = {
  SWAP: u64leDiscriminator([248, 198, 158, 145, 225, 117, 135, 200]),
  ADD_LIQUIDITY: u64leDiscriminator([181, 157, 89, 67, 143, 182, 52, 72]),
  REMOVE_LIQUIDITY: u64leDiscriminator([80, 85, 209, 72, 24, 206, 177, 108]),
  CREATE_POOL: u64leDiscriminator([95, 180, 10, 172, 84, 174, 232, 40]),
} as const;

function discEq(data: Uint8Array, disc: bigint): boolean {
  if (data.length < 8) return false;
  return readU64LE(data, 0) === disc;
}

export function parseMeteoraPoolsInstruction(
  instructionData: Uint8Array,
  accounts: string[],
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number
): DexEvent | null {
  if (instructionData.length < 8) return null;
  const metadata = ixMeta(signature, slot, txIndex, blockTimeUs, grpcRecvUs);
  const pool = getAccount(accounts, 0);

  if (discEq(instructionData, DISC.SWAP)) {
    if (!pool || instructionData.length < 24) return null;
    return {
      MeteoraPoolsSwap: {
        metadata,
        in_amount: readU64LE(instructionData, 8) ?? 0n,
        out_amount: readU64LE(instructionData, 16) ?? 0n,
        trade_fee: 0n,
        admin_fee: 0n,
        host_fee: 0n,
      },
    };
  }

  if (discEq(instructionData, DISC.ADD_LIQUIDITY)) {
    if (!pool || instructionData.length < 32) return null;
    return {
      MeteoraPoolsAddLiquidity: {
        metadata,
        lp_mint_amount: readU64LE(instructionData, 8) ?? 0n,
        token_a_amount: readU64LE(instructionData, 16) ?? 0n,
        token_b_amount: readU64LE(instructionData, 24) ?? 0n,
      },
    };
  }

  if (discEq(instructionData, DISC.REMOVE_LIQUIDITY)) {
    if (!pool || instructionData.length < 32) return null;
    return {
      MeteoraPoolsRemoveLiquidity: {
        metadata,
        lp_unmint_amount: readU64LE(instructionData, 8) ?? 0n,
        token_a_out_amount: readU64LE(instructionData, 16) ?? 0n,
        token_b_out_amount: readU64LE(instructionData, 24) ?? 0n,
      },
    };
  }

  if (discEq(instructionData, DISC.CREATE_POOL)) {
    if (instructionData.length < 8 + 1 + 6 * 8 || accounts.length <= 9) return null;
    return {
      MeteoraPoolsPoolCreated: {
        metadata,
        lp_mint: getAccount(accounts, 4) ?? Z,
        token_a_mint: getAccount(accounts, 8) ?? Z,
        token_b_mint: getAccount(accounts, 9) ?? Z,
        pool_type: readU8(instructionData, 8) ?? 0,
        pool: pool ?? Z,
      },
    };
  }

  return null;
}
