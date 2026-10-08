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
  CREATE_POOL: u64leDiscriminator([7, 166, 138, 171, 206, 171, 236, 244]),
  CREATE_POOL_CONFIG2: u64leDiscriminator([48, 149, 220, 130, 61, 11, 9, 178]),
} as const;

function discEq(data: Uint8Array, disc: bigint): boolean {
  if (data.length < 8) return false;
  return readU64LE(data, 0) === disc;
}

export function parseMeteoraPoolsInstruction(
  instructionData: Uint8Array,
  accounts: string[],
  signature: string,
  slot: number | bigint | string,
  txIndex: number | bigint | string,
  blockTimeUs: number | bigint | string | undefined,
  grpcRecvUs: number | bigint | string
): DexEvent | null {
  if (instructionData.length < 8) return null;
  const metadata = ixMeta(signature, slot, txIndex, blockTimeUs, grpcRecvUs);
  const pool = getAccount(accounts, 0);

  if (discEq(instructionData, DISC.SWAP)) {
    if (!pool || instructionData.length < 24) return null;
    return {
      MeteoraPoolsSwap: {
        metadata,
        amount_in: readU64LE(instructionData, 8) ?? 0n,
        minimum_out_amount: readU64LE(instructionData, 16) ?? 0n,
        in_amount: 0n,
        out_amount: 0n,
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

  if (discEq(instructionData, DISC.CREATE_POOL) || discEq(instructionData, DISC.CREATE_POOL_CONFIG2)) {
    if (instructionData.length < 24 || accounts.length < 5) return null;
    if (discEq(instructionData, DISC.CREATE_POOL_CONFIG2)) {
      const tag = readU8(instructionData, 24);
      if (tag === null || (tag !== 0 && tag !== 1) || (tag === 1 && instructionData.length < 33)) return null;
    }
    return {
      MeteoraPoolsPoolCreated: {
        metadata,
        lp_mint: getAccount(accounts, 2) ?? Z,
        token_a_mint: getAccount(accounts, 3) ?? Z,
        token_b_mint: getAccount(accounts, 4) ?? Z,
        pool_type: 1, // PoolType::Permissionless, independent of CurveType.
        pool: pool ?? Z,
      },
    };
  }

  return null;
}
