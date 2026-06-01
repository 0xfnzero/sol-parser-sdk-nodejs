import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { readI32LE, readU16LE, readU32LE, readU64LE } from "../util/binary.js";
import { getAccount, ixMeta } from "./utils.js";

const Z = defaultPubkey();

export function parseMeteoraDlmmInstruction(
  instructionData: Uint8Array,
  accounts: string[],
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number
): DexEvent | null {
  if (instructionData.length === 0) return null;
  const pool = getAccount(accounts, 0);
  if (!pool) return null;

  const metadata = ixMeta(signature, slot, txIndex, blockTimeUs, grpcRecvUs);
  const kind = instructionData[0]!;

  if (kind === 0) {
    if (instructionData.length < 1 + 4 + 2) return null;
    const active_bin_id = readI32LE(instructionData, 1);
    const bin_step = readU16LE(instructionData, 5);
    if (active_bin_id === null || bin_step === null) return null;
    return {
      MeteoraDlmmInitializePool: {
        metadata,
        pool,
        creator: getAccount(accounts, 1) ?? Z,
        active_bin_id,
        bin_step,
      },
    };
  }

  if (kind === 1) {
    if (instructionData.length < 1 + 8) return null;
    return {
      MeteoraDlmmInitializeBinArray: {
        metadata,
        pool,
        bin_array: getAccount(accounts, 1) ?? Z,
        index: readU64LE(instructionData, 1) ?? 0n,
      },
    };
  }

  if (kind === 2) {
    if (instructionData.length < 1 + 32) return null;
    return {
      MeteoraDlmmAddLiquidity: {
        metadata,
        pool,
        from: getAccount(accounts, 1) ?? Z,
        position: getAccount(accounts, 2) ?? Z,
        amounts: [0n, 0n],
        active_bin_id: 0,
      },
    };
  }

  if (kind === 7) {
    if (instructionData.length < 1 + 32) return null;
    return {
      MeteoraDlmmRemoveLiquidity: {
        metadata,
        pool,
        from: getAccount(accounts, 1) ?? Z,
        position: getAccount(accounts, 2) ?? Z,
        amounts: [0n, 0n],
        active_bin_id: 0,
      },
    };
  }

  if (kind === 8) {
    if (instructionData.length < 1 + 4 + 4) return null;
    const lower_bin_id = readI32LE(instructionData, 1);
    const width = readU32LE(instructionData, 5);
    if (lower_bin_id === null || width === null) return null;
    return {
      MeteoraDlmmCreatePosition: {
        metadata,
        pool,
        position: getAccount(accounts, 1) ?? Z,
        owner: getAccount(accounts, 2) ?? Z,
        lower_bin_id,
        width,
      },
    };
  }

  if (kind === 11) {
    if (instructionData.length < 1 + 8 + 8) return null;
    return {
      MeteoraDlmmSwap: {
        metadata,
        pool,
        from: getAccount(accounts, 1) ?? Z,
        start_bin_id: 0,
        end_bin_id: 0,
        amount_in: readU64LE(instructionData, 1) ?? 0n,
        amount_out: 0n,
        swap_for_y: false,
        fee: 0n,
        protocol_fee: 0n,
        fee_bps: 0n,
        host_fee: 0n,
      },
    };
  }

  if (kind === 13) {
    return {
      MeteoraDlmmClaimFee: {
        metadata,
        pool,
        position: getAccount(accounts, 1) ?? Z,
        owner: getAccount(accounts, 2) ?? Z,
        fee_x: 0n,
        fee_y: 0n,
      },
    };
  }

  if (kind === 14) {
    return {
      MeteoraDlmmClosePosition: {
        metadata,
        pool,
        position: getAccount(accounts, 1) ?? Z,
        owner: getAccount(accounts, 2) ?? Z,
      },
    };
  }

  return null;
}
