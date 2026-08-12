import type { DexEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { readI32LE, readI64LE, readU16LE, readU64LE } from "../util/binary.js";
import { getAccount, ixMeta } from "./utils.js";

const Z = defaultPubkey();

function discEq(data: Uint8Array, bytes: readonly number[]): boolean {
  return data.length >= 8 && bytes.every((b, i) => data[i] === b);
}

const IX = {
  ADD_LIQUIDITY: [181, 157, 89, 67, 143, 182, 52, 72],
  ADD_LIQUIDITY2: [228, 162, 78, 28, 70, 219, 116, 115],
  CLAIM_FEE: [169, 32, 79, 137, 136, 232, 70, 137],
  CLAIM_FEE2: [112, 191, 101, 171, 28, 144, 127, 187],
  CLOSE_POSITION: [123, 134, 81, 0, 49, 68, 98, 98],
  CLOSE_POSITION2: [174, 90, 35, 115, 186, 40, 147, 226],
  INITIALIZE_BIN_ARRAY: [35, 86, 19, 185, 78, 212, 75, 211],
  INITIALIZE_LB_PAIR: [45, 154, 237, 210, 221, 15, 166, 92],
  INITIALIZE_LB_PAIR2: [73, 59, 36, 120, 237, 83, 108, 198],
  INITIALIZE_POSITION: [219, 192, 234, 71, 190, 191, 102, 80],
  INITIALIZE_POSITION2: [143, 19, 242, 145, 213, 15, 104, 115],
  INITIALIZE_POSITION_PDA: [46, 82, 125, 146, 85, 141, 228, 153],
  REMOVE_LIQUIDITY: [80, 85, 209, 72, 24, 206, 177, 108],
  REMOVE_LIQUIDITY2: [230, 215, 82, 127, 241, 101, 227, 146],
  SWAP: [248, 198, 158, 145, 225, 117, 135, 200],
  SWAP2: [65, 75, 63, 76, 235, 91, 91, 136],
  SWAP_EXACT_OUT: [250, 73, 101, 33, 38, 207, 75, 184],
  SWAP_EXACT_OUT2: [43, 215, 247, 132, 137, 60, 243, 81],
  SWAP_WITH_PRICE_IMPACT: [56, 173, 230, 208, 173, 228, 156, 205],
  SWAP_WITH_PRICE_IMPACT2: [74, 98, 192, 214, 177, 51, 75, 51],
} as const;

export function parseMeteoraDlmmInstruction(
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
  const data = instructionData.subarray(8);

  if (discEq(instructionData, IX.INITIALIZE_LB_PAIR)) {
    const pool = getAccount(accounts, 0);
    if (!pool || data.length < 6) return null;
    const active_bin_id = readI32LE(data, 0);
    const bin_step = readU16LE(data, 4);
    if (active_bin_id === null || bin_step === null) return null;
    return {
      MeteoraDlmmInitializePool: {
        metadata,
        pool,
        creator: getAccount(accounts, 8) ?? Z,
        active_bin_id,
        bin_step,
      },
    };
  }

  if (discEq(instructionData, IX.INITIALIZE_LB_PAIR2)) {
    const pool = getAccount(accounts, 0);
    if (!pool || data.length < 4) return null;
    return {
      MeteoraDlmmInitializePool: {
        metadata,
        pool,
        creator: getAccount(accounts, 8) ?? Z,
        active_bin_id: readI32LE(data, 0) ?? 0,
        bin_step: 0,
      },
    };
  }

  if (discEq(instructionData, IX.INITIALIZE_BIN_ARRAY)) {
    const pool = getAccount(accounts, 0);
    if (!pool || data.length < 8) return null;
    return {
      MeteoraDlmmInitializeBinArray: {
        metadata,
        pool,
        bin_array: getAccount(accounts, 1) ?? Z,
        index: readI64LE(data, 0) ?? 0n,
      },
    };
  }

  if (discEq(instructionData, IX.ADD_LIQUIDITY) || discEq(instructionData, IX.ADD_LIQUIDITY2)) {
    const pool = getAccount(accounts, 1);
    if (!pool) return null;
    const senderIndex = discEq(instructionData, IX.ADD_LIQUIDITY2) ? 9 : 11;
    const from = getAccount(accounts, senderIndex);
    if (!from) return null;
    return {
      MeteoraDlmmAddLiquidity: {
        metadata,
        pool,
        from,
        position: getAccount(accounts, 0) ?? Z,
        amounts: [0n, 0n],
        active_bin_id: 0,
      },
    };
  }

  if (discEq(instructionData, IX.REMOVE_LIQUIDITY) || discEq(instructionData, IX.REMOVE_LIQUIDITY2)) {
    const pool = getAccount(accounts, 1);
    if (!pool) return null;
    const senderIndex = discEq(instructionData, IX.REMOVE_LIQUIDITY2) ? 9 : 11;
    const from = getAccount(accounts, senderIndex);
    if (!from) return null;
    return {
      MeteoraDlmmRemoveLiquidity: {
        metadata,
        pool,
        from,
        position: getAccount(accounts, 0) ?? Z,
        amounts: [0n, 0n],
        active_bin_id: 0,
      },
    };
  }

  if (
    discEq(instructionData, IX.INITIALIZE_POSITION) ||
    discEq(instructionData, IX.INITIALIZE_POSITION2) ||
    discEq(instructionData, IX.INITIALIZE_POSITION_PDA)
  ) {
    if (data.length < 8) return null;
    const lower_bin_id = readI32LE(data, 0);
    const width = readI32LE(data, 4);
    if (lower_bin_id === null || width === null || width < 0) return null;
    const pda = discEq(instructionData, IX.INITIALIZE_POSITION_PDA);
    const position = getAccount(accounts, pda ? 2 : 1);
    const pool = getAccount(accounts, pda ? 3 : 2);
    const owner = getAccount(accounts, pda ? 4 : 3);
    if (!position || !pool || !owner) return null;
    return {
      MeteoraDlmmCreatePosition: {
        metadata,
        pool,
        position,
        owner,
        lower_bin_id,
        width,
      },
    };
  }

  if (discEq(instructionData, IX.SWAP) || discEq(instructionData, IX.SWAP2)) {
    const pool = getAccount(accounts, 0);
    if (!pool || data.length < 16) return null;
    return {
      MeteoraDlmmSwap: {
        metadata,
        pool,
        from: getAccount(accounts, 10) ?? Z,
        start_bin_id: 0,
        end_bin_id: 0,
        amount_in: readU64LE(data, 0) ?? 0n,
        amount_out: 0n,
        swap_for_y: false,
        fee: 0n,
        protocol_fee: 0n,
        fee_bps: 0n,
        host_fee: 0n,
      },
    };
  }

  if (
    discEq(instructionData, IX.SWAP_EXACT_OUT) ||
    discEq(instructionData, IX.SWAP_EXACT_OUT2) ||
    discEq(instructionData, IX.SWAP_WITH_PRICE_IMPACT) ||
    discEq(instructionData, IX.SWAP_WITH_PRICE_IMPACT2)
  ) {
    const pool = getAccount(accounts, 0);
    if (!pool || data.length < 8) return null;
    return {
      MeteoraDlmmSwap: {
        metadata,
        pool,
        from: getAccount(accounts, 10) ?? Z,
        start_bin_id: 0,
        end_bin_id: 0,
        amount_in: readU64LE(data, 0) ?? 0n,
        amount_out: discEq(instructionData, IX.SWAP_EXACT_OUT) || discEq(instructionData, IX.SWAP_EXACT_OUT2)
          ? readU64LE(data, 8) ?? 0n
          : 0n,
        swap_for_y: false,
        fee: 0n,
        protocol_fee: 0n,
        fee_bps: 0n,
        host_fee: 0n,
      },
    };
  }

  if (discEq(instructionData, IX.CLAIM_FEE) || discEq(instructionData, IX.CLAIM_FEE2)) {
    const pool = getAccount(accounts, 0);
    const owner = getAccount(accounts, discEq(instructionData, IX.CLAIM_FEE2) ? 2 : 4);
    if (!pool || !owner) return null;
    return {
      MeteoraDlmmClaimFee: {
        metadata,
        pool,
        position: getAccount(accounts, 1) ?? Z,
        owner,
        fee_x: 0n,
        fee_y: 0n,
      },
    };
  }

  if (discEq(instructionData, IX.CLOSE_POSITION) || discEq(instructionData, IX.CLOSE_POSITION2)) {
    const position = getAccount(accounts, 0);
    const v2 = discEq(instructionData, IX.CLOSE_POSITION2);
    const owner = getAccount(accounts, v2 ? 1 : 4);
    if (!position || !owner) return null;
    return {
      MeteoraDlmmClosePosition: {
        metadata,
        pool: v2 ? Z : getAccount(accounts, 1) ?? Z,
        position,
        owner,
      },
    };
  }

  return null;
}
