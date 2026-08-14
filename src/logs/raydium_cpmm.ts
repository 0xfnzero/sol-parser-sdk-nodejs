import type { EventMetadata } from "../core/metadata.js";
import type {
  DexEvent,
  RaydiumCpmmDepositEvent,
  RaydiumCpmmInitializeEvent,
  RaydiumCpmmSwapEvent,
  RaydiumCpmmWithdrawEvent,
} from "../core/dex_event.js";
import { readBool, readPubkey, readU64LE } from "../util/binary.js";

function bn64(v: ReturnType<typeof readU64LE>): bigint {
  return v ?? 0n;
}

/** Current Anchor `SwapEvent` payload (the 8-byte event discriminator is removed by the caller). */
export function parseSwapEventFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  // pool_id + six u64 fields + base_input. Newer IDLs append mint/fee fields,
  // which remain wire-compatible with this stable prefix.
  if (data.length < 32 + (6 * 8) + 1) return null;
  let o = 0;
  const pool_id = readPubkey(data, o);
  if (!pool_id) return null;
  o += 32;
  const input_vault_before = readU64LE(data, o);
  o += 8;
  const output_vault_before = readU64LE(data, o);
  o += 8;
  const input_amount = readU64LE(data, o);
  o += 8;
  const output_amount = readU64LE(data, o);
  o += 8;
  const input_transfer_fee = readU64LE(data, o);
  o += 8;
  const output_transfer_fee = readU64LE(data, o);
  o += 8;
  const base_input = readBool(data, o);
  if (
    input_vault_before == null || output_vault_before == null ||
    input_amount == null || output_amount == null ||
    input_transfer_fee == null || output_transfer_fee == null ||
    base_input == null
  ) return null;

  const ev: RaydiumCpmmSwapEvent = {
    metadata,
    pool_id,
    input_vault_before,
    output_vault_before,
    input_amount,
    output_amount,
    input_transfer_fee,
    output_transfer_fee,
    base_input,
  };
  return { RaydiumCpmmSwap: ev };
}

export function parseSwapBaseInFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool_state = readPubkey(data, o)!;
  o += 32;
  o += 32;
  const amount_in = bn64(readU64LE(data, o));
  o += 8;
  o += 8;
  const amount_out = bn64(readU64LE(data, o));
  o += 8;
  const is_base_input = readBool(data, o)!;
  const ev: RaydiumCpmmSwapEvent = {
    metadata,
    pool_id: pool_state,
    input_vault_before: 0n,
    output_vault_before: 0n,
    input_amount: amount_in,
    output_amount: amount_out,
    input_transfer_fee: 0n,
    output_transfer_fee: 0n,
    base_input: is_base_input,
  };
  return { RaydiumCpmmSwap: ev };
}

export function parseSwapBaseOutFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool_state = readPubkey(data, o)!;
  o += 32;
  o += 32;
  o += 8;
  const amount_out = bn64(readU64LE(data, o));
  o += 8;
  const amount_in = bn64(readU64LE(data, o));
  o += 8;
  const is_base_output = readBool(data, o)!;
  const ev: RaydiumCpmmSwapEvent = {
    metadata,
    pool_id: pool_state,
    input_vault_before: 0n,
    output_vault_before: 0n,
    input_amount: amount_in,
    output_amount: amount_out,
    input_transfer_fee: 0n,
    output_transfer_fee: 0n,
    base_input: !is_base_output,
  };
  return { RaydiumCpmmSwap: ev };
}

export function parseCreatePoolFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool_state = readPubkey(data, o)!;
  o += 32;
  o += 32;
  o += 32;
  const creator = readPubkey(data, o)!;
  o += 32;
  const initial_amount_0 = bn64(readU64LE(data, o));
  o += 8;
  const initial_amount_1 = bn64(readU64LE(data, o));
  const ev: RaydiumCpmmInitializeEvent = {
    metadata,
    pool: pool_state,
    creator,
    init_amount0: initial_amount_0,
    init_amount1: initial_amount_1,
  };
  return { RaydiumCpmmInitialize: ev };
}

export function parseDepositFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool_state = readPubkey(data, o)!;
  o += 32;
  const user = readPubkey(data, o)!;
  o += 32;
  const lp_token_amount = bn64(readU64LE(data, o));
  o += 8;
  const token_0_amount = bn64(readU64LE(data, o));
  o += 8;
  const token_1_amount = bn64(readU64LE(data, o));
  const ev: RaydiumCpmmDepositEvent = {
    metadata,
    pool: pool_state,
    user,
    lp_token_amount,
    token0_amount: token_0_amount,
    token1_amount: token_1_amount,
  };
  return { RaydiumCpmmDeposit: ev };
}

export function parseWithdrawFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const pool_state = readPubkey(data, o)!;
  o += 32;
  const user = readPubkey(data, o)!;
  o += 32;
  const lp_token_amount = bn64(readU64LE(data, o));
  o += 8;
  const token_0_amount = bn64(readU64LE(data, o));
  o += 8;
  const token_1_amount = bn64(readU64LE(data, o));
  const ev: RaydiumCpmmWithdrawEvent = {
    metadata,
    pool: pool_state,
    user,
    lp_token_amount,
    token0_amount: token_0_amount,
    token1_amount: token_1_amount,
  };
  return { RaydiumCpmmWithdraw: ev };
}
