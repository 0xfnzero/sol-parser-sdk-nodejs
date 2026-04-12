import { makeMetadata, type EventMetadata } from "../core/metadata.js";
import type { DexEvent, MeteoraDammV2SwapEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { decodeProgramDataLine } from "./program_data.js";
import { readBool, readPubkey, readU128LE, readU64LE, readU8 } from "../util/binary.js";

function discOf(bytes: readonly number[]): bigint {
  const u8 = new Uint8Array(8);
  for (let i = 0; i < 8; i++) u8[i] = bytes[i]!;
  return new DataView(u8.buffer).getBigUint64(0, true);
}

const SWAP = discOf([27, 60, 21, 213, 138, 170, 187, 147]);
const SWAP2 = discOf([189, 66, 51, 168, 38, 80, 117, 153]);

function bn64(v: ReturnType<typeof readU64LE>): bigint {
  return v ?? 0n;
}

function emptyVaults(): Pick<
  MeteoraDammV2SwapEvent,
  "token_a_vault" | "token_b_vault" | "token_a_mint" | "token_b_mint" | "token_a_program" | "token_b_program"
> {
  const z = defaultPubkey();
  return {
    token_a_vault: z,
    token_b_vault: z,
    token_a_mint: z,
    token_b_mint: z,
    token_a_program: z,
    token_b_program: z,
  };
}

function parseSwapEvent(data: Uint8Array, meta: EventMetadata): DexEvent | null {
  let o = 0;
  const pool = readPubkey(data, o)!;
  o += 32;
  o += 32;
  const trade_direction = readU8(data, o)!;
  o += 1;
  const has_referral = readBool(data, o)!;
  o += 1;
  const amount_in = bn64(readU64LE(data, o));
  o += 8;
  const minimum_amount_out = bn64(readU64LE(data, o));
  o += 8;
  const actual_input_amount = bn64(readU64LE(data, o));
  o += 8;
  const output_amount = bn64(readU64LE(data, o));
  o += 8;
  const next_sqrt_price = readU128LE(data, o)!;
  o += 16;
  const lp_fee = bn64(readU64LE(data, o));
  o += 8;
  const protocol_fee = bn64(readU64LE(data, o));
  o += 8;
  const referral_fee = bn64(readU64LE(data, o));
  o += 8;
  o += 8;
  const current_timestamp = bn64(readU64LE(data, o));
  const ev: MeteoraDammV2SwapEvent = {
    metadata: meta,
    pool,
    amount_in,
    output_amount,
    trade_direction,
    has_referral,
    minimum_amount_out,
    next_sqrt_price,
    lp_fee,
    protocol_fee,
    partner_fee: 0n,
    referral_fee,
    actual_amount_in: actual_input_amount,
    current_timestamp,
    ...emptyVaults(),
  };
  return { MeteoraDammV2Swap: ev };
}

function parseSwap2Event(data: Uint8Array, meta: EventMetadata): DexEvent | null {
  let o = 0;
  const pool = readPubkey(data, o)!;
  o += 32;
  const trade_direction = readU8(data, o)!;
  o += 1;
  o += 1;
  const has_referral = readBool(data, o)!;
  o += 1;
  const amount_0 = bn64(readU64LE(data, o));
  o += 8;
  const amount_1 = bn64(readU64LE(data, o));
  o += 8;
  const swap_mode = readU8(data, o)!;
  o += 1;
  const included_fee_input_amount = bn64(readU64LE(data, o));
  o += 8;
  o += 8;
  o += 8;
  const output_amount = bn64(readU64LE(data, o));
  o += 8;
  const next_sqrt_price = readU128LE(data, o)!;
  o += 16;
  const lp_fee = bn64(readU64LE(data, o));
  o += 8;
  const protocol_fee = bn64(readU64LE(data, o));
  o += 8;
  const referral_fee = bn64(readU64LE(data, o));
  o += 8;
  o += 8;
  o += 8;
  const current_timestamp = bn64(readU64LE(data, o));
  const [amount_in, minimum_amount_out] =
    swap_mode === 0 ? [amount_0, amount_1] : [amount_1, amount_0];
  const ev: MeteoraDammV2SwapEvent = {
    metadata: meta,
    pool,
    amount_in,
    output_amount,
    trade_direction,
    has_referral,
    minimum_amount_out,
    next_sqrt_price,
    lp_fee,
    protocol_fee,
    partner_fee: 0n,
    referral_fee,
    actual_amount_in: included_fee_input_amount,
    current_timestamp,
    ...emptyVaults(),
  };
  return { MeteoraDammV2Swap: ev };
}

/**
 * Meteora DAMM Program data 入口；与 Rust `logs/meteora_damm.rs` 一致，仅解析 Swap / Swap2（其余 discriminator 不产出事件）。
 */
export function parseMeteoraDammLog(
  log: string,
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number
): DexEvent | null {
  const programData = decodeProgramDataLine(log);
  if (!programData) return null;
  const disc = new DataView(programData.buffer, programData.byteOffset, 8).getBigUint64(0, true);
  const data = programData.subarray(8);
  const meta = makeMetadata(signature, slot, txIndex, blockTimeUs, grpcRecvUs);
  if (disc === SWAP) return parseSwapEvent(data, meta);
  if (disc === SWAP2) return parseSwap2Event(data, meta);
  return null;
}
