/** Meteora DLMM 结构化日志解析 */
import { makeMetadata, type EventMetadata } from "../core/metadata.js";
import type {
  DexEvent,
  MeteoraDlmmAddLiquidityEvent,
  MeteoraDlmmClaimFeeEvent,
  MeteoraDlmmClosePositionEvent,
  MeteoraDlmmCreatePositionEvent,
  MeteoraDlmmInitializeBinArrayEvent,
  MeteoraDlmmInitializePoolEvent,
  MeteoraDlmmRemoveLiquidityEvent,
  MeteoraDlmmSwapEvent,
} from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { decodeProgramDataLine } from "./program_data.js";
import { readBool, readPubkey, readI32LE, readU16LE, readU32LE, readU64LE, readU128LE } from "../util/binary.js";

function disc(bytes: readonly number[]): bigint {
  const u8 = new Uint8Array(8);
  for (let i = 0; i < 8; i++) u8[i] = bytes[i]!;
  return new DataView(u8.buffer).getBigUint64(0, true);
}

const DLMM = {
  SWAP: disc([81, 108, 227, 190, 205, 208, 10, 196]),
  SWAP2: disc([46, 116, 82, 215, 148, 27, 84, 77]),
  ADD_LIQ: disc([31, 94, 125, 90, 227, 52, 61, 186]),
  REMOVE_LIQ: disc([116, 244, 97, 232, 103, 31, 152, 58]),
  INIT_BIN_ARRAY: disc([11, 18, 155, 194, 33, 115, 238, 119]),
  INIT_POOL: disc([185, 74, 252, 125, 27, 215, 188, 111]),
  CREATE_POS: disc([144, 142, 252, 84, 157, 53, 37, 121]),
  CLOSE_POS: disc([255, 196, 16, 107, 28, 202, 53, 128]),
  CLAIM_FEE: disc([75, 122, 154, 48, 140, 74, 123, 163]),
  CLAIM_FEE2: disc([232, 171, 242, 97, 58, 77, 35, 45]),
  LEGACY_SWAP: disc([143, 190, 90, 218, 196, 30, 51, 222]),
  LEGACY_ADD_LIQ: disc([181, 157, 89, 67, 143, 182, 52, 72]),
  LEGACY_REMOVE_LIQ: disc([80, 85, 209, 72, 24, 206, 35, 178]),
  LEGACY_INIT_POOL: disc([95, 180, 10, 172, 84, 174, 232, 40]),
  LEGACY_CREATE_POS: disc([123, 233, 11, 43, 146, 180, 97, 119]),
  LEGACY_CLOSE_POS: disc([94, 168, 102, 45, 59, 122, 137, 54]),
  LEGACY_CLAIM_FEE: disc([152, 70, 208, 111, 104, 91, 44, 1]),
};

function bn64(v: ReturnType<typeof readU64LE>): bigint {
  return v ?? 0n;
}

export function parseDlmmFromDecoded(programData: Uint8Array, metadata: EventMetadata): DexEvent | null {
  if (programData.length < 8) return null;
  const dv = new DataView(programData.buffer, programData.byteOffset, 8);
  const discriminator = dv.getBigUint64(0, true);
  const data = programData.subarray(8);
  return parseDlmmEventFromData(discriminator, data, metadata);
}

export function parseDlmmEventFromData(
  discriminator: bigint,
  data: Uint8Array,
  metadata: EventMetadata
): DexEvent | null {
  if (discriminator === DLMM.SWAP || discriminator === DLMM.LEGACY_SWAP) {
    if (data.length < 129) return null;
    let o = 0;
    const pool = readPubkey(data, o)!;
    o += 32;
    const from = readPubkey(data, o)!;
    o += 32;
    const start_bin_id = readI32LE(data, o)!;
    o += 4;
    const end_bin_id = readI32LE(data, o)!;
    o += 4;
    const amount_in = bn64(readU64LE(data, o));
    o += 8;
    const amount_out = bn64(readU64LE(data, o));
    o += 8;
    const swap_for_y = readBool(data, o)!;
    o += 1;
    const fee = bn64(readU64LE(data, o));
    o += 8;
    const protocol_fee = bn64(readU64LE(data, o));
    o += 8;
    const fee_bps = readU128LE(data, o)!;
    o += 16;
    const host_fee = bn64(readU64LE(data, o));
    const ev: MeteoraDlmmSwapEvent = {
      metadata,
      pool,
      from,
      start_bin_id,
      end_bin_id,
      amount_in,
      amount_out,
      swap_for_y,
      fee,
      protocol_fee,
      fee_bps,
      host_fee,
    };
    return { MeteoraDlmmSwap: ev };
  }

  if (discriminator === DLMM.SWAP2) {
    if (data.length < 147) return null;
    let o = 0;
    const pool = readPubkey(data, o)!;
    o += 32;
    const from = readPubkey(data, o)!;
    o += 32;
    const start_bin_id = readI32LE(data, o)!;
    o += 4;
    const end_bin_id = readI32LE(data, o)!;
    o += 4;
    const swap_for_y = readBool(data, o)!;
    o += 1;
    const fee_bps = readU128LE(data, o)!;
    o += 16;
    const amount_in = bn64(readU64LE(data, o));
    o += 8;
    o += 8; // amount_left
    const amount_out = bn64(readU64LE(data, o));
    o += 8;
    const fee = bn64(readU64LE(data, o));
    o += 8;
    const protocol_fee = bn64(readU64LE(data, o));
    o += 8;
    o += 8; // limit_order_fee
    const host_fee = bn64(readU64LE(data, o));
    const ev: MeteoraDlmmSwapEvent = {
      metadata,
      pool,
      from,
      start_bin_id,
      end_bin_id,
      amount_in,
      amount_out,
      swap_for_y,
      fee,
      protocol_fee,
      fee_bps,
      host_fee,
    };
    return { MeteoraDlmmSwap: ev };
  }

  if (discriminator === DLMM.ADD_LIQ || discriminator === DLMM.LEGACY_ADD_LIQ) {
    if (data.length < 116) return null;
    let o = 0;
    const pool = readPubkey(data, o)!;
    o += 32;
    const from = readPubkey(data, o)!;
    o += 32;
    const position = readPubkey(data, o)!;
    o += 32;
    const a0 = bn64(readU64LE(data, o));
    o += 8;
    const a1 = bn64(readU64LE(data, o));
    o += 8;
    const active_bin_id = readI32LE(data, o)!;
    const ev: MeteoraDlmmAddLiquidityEvent = {
      metadata,
      pool,
      from,
      position,
      amounts: [a0, a1],
      active_bin_id,
    };
    return { MeteoraDlmmAddLiquidity: ev };
  }

  if (discriminator === DLMM.REMOVE_LIQ || discriminator === DLMM.LEGACY_REMOVE_LIQ) {
    if (data.length < 116) return null;
    let o = 0;
    const pool = readPubkey(data, o)!;
    o += 32;
    const from = readPubkey(data, o)!;
    o += 32;
    const position = readPubkey(data, o)!;
    o += 32;
    const a0 = bn64(readU64LE(data, o));
    o += 8;
    const a1 = bn64(readU64LE(data, o));
    o += 8;
    const active_bin_id = readI32LE(data, o)!;
    const ev: MeteoraDlmmRemoveLiquidityEvent = {
      metadata,
      pool,
      from,
      position,
      amounts: [a0, a1],
      active_bin_id,
    };
    return { MeteoraDlmmRemoveLiquidity: ev };
  }

  if (discriminator === DLMM.INIT_POOL) {
    if (data.length < 98) return null;
    let o = 0;
    const pool = readPubkey(data, o)!;
    o += 32;
    const bin_step = readU16LE(data, o)!;
    const ev: MeteoraDlmmInitializePoolEvent = {
      metadata,
      pool,
      creator: defaultPubkey(),
      active_bin_id: 0,
      bin_step,
    };
    return { MeteoraDlmmInitializePool: ev };
  }

  if (discriminator === DLMM.LEGACY_INIT_POOL) {
    if (data.length < 70) return null;
    let o = 0;
    const pool = readPubkey(data, o)!;
    o += 32;
    const creator = readPubkey(data, o)!;
    o += 32;
    const active_bin_id = readI32LE(data, o)!;
    o += 4;
    const bin_step = readU16LE(data, o)!;
    const ev: MeteoraDlmmInitializePoolEvent = {
      metadata,
      pool,
      creator,
      active_bin_id,
      bin_step,
    };
    return { MeteoraDlmmInitializePool: ev };
  }

  if (discriminator === DLMM.INIT_BIN_ARRAY) {
    if (data.length < 72) return null;
    let o = 0;
    const pool = readPubkey(data, o)!;
    o += 32;
    const bin_array = readPubkey(data, o)!;
    o += 32;
    const index = bn64(readU64LE(data, o));
    const ev: MeteoraDlmmInitializeBinArrayEvent = { metadata, pool, bin_array, index };
    return { MeteoraDlmmInitializeBinArray: ev };
  }

  if (discriminator === DLMM.CREATE_POS) {
    if (data.length < 96) return null;
    let o = 0;
    const pool = readPubkey(data, o)!;
    o += 32;
    const position = readPubkey(data, o)!;
    o += 32;
    const owner = readPubkey(data, o)!;
    const ev: MeteoraDlmmCreatePositionEvent = {
      metadata,
      pool,
      position,
      owner,
      lower_bin_id: 0,
      width: 0,
    };
    return { MeteoraDlmmCreatePosition: ev };
  }

  if (discriminator === DLMM.LEGACY_CREATE_POS) {
    if (data.length < 104) return null;
    let o = 0;
    const pool = readPubkey(data, o)!;
    o += 32;
    const position = readPubkey(data, o)!;
    o += 32;
    const owner = readPubkey(data, o)!;
    o += 32;
    const lower_bin_id = readI32LE(data, o)!;
    o += 4;
    const width = readU32LE(data, o)!;
    const ev: MeteoraDlmmCreatePositionEvent = {
      metadata,
      pool,
      position,
      owner,
      lower_bin_id,
      width,
    };
    return { MeteoraDlmmCreatePosition: ev };
  }

  if (discriminator === DLMM.CLOSE_POS) {
    if (data.length < 64) return null;
    let o = 0;
    const position = readPubkey(data, o)!;
    o += 32;
    const owner = readPubkey(data, o)!;
    const ev: MeteoraDlmmClosePositionEvent = {
      metadata,
      pool: defaultPubkey(),
      position,
      owner,
    };
    return { MeteoraDlmmClosePosition: ev };
  }

  if (discriminator === DLMM.LEGACY_CLOSE_POS) {
    if (data.length < 96) return null;
    let o = 0;
    const pool = readPubkey(data, o)!;
    o += 32;
    const position = readPubkey(data, o)!;
    o += 32;
    const owner = readPubkey(data, o)!;
    const ev: MeteoraDlmmClosePositionEvent = { metadata, pool, position, owner };
    return { MeteoraDlmmClosePosition: ev };
  }

  if (discriminator === DLMM.CLAIM_FEE || discriminator === DLMM.CLAIM_FEE2 || discriminator === DLMM.LEGACY_CLAIM_FEE) {
    const requiredLength = discriminator === DLMM.CLAIM_FEE2 ? 116 : 112;
    if (data.length < requiredLength) return null;
    let o = 0;
    const pool = readPubkey(data, o)!;
    o += 32;
    const position = readPubkey(data, o)!;
    o += 32;
    const owner = readPubkey(data, o)!;
    o += 32;
    const fee_x = bn64(readU64LE(data, o));
    o += 8;
    const fee_y = bn64(readU64LE(data, o));
    const ev: MeteoraDlmmClaimFeeEvent = { metadata, pool, position, owner, fee_x, fee_y };
    return { MeteoraDlmmClaimFee: ev };
  }

  return null;
}

/** 从整行日志解析 */
export function parseMeteoraDlmmLog(
  log: string,
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number
): DexEvent | null {
  const buf = decodeProgramDataLine(log);
  if (!buf) return null;
  const meta = makeMetadata(signature, slot, txIndex, blockTimeUs, grpcRecvUs);
  return parseDlmmFromDecoded(buf, meta);
}
