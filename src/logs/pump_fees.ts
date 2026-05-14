import type { EventMetadata } from "../core/metadata.js";
import type {
  DexEvent,
  PumpFeesConfigStatus,
  PumpFeesFeeTier,
  PumpFeesFees,
  PumpFeesShareholder,
} from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import { readI64LE, readPubkey, readU8, readU16LE, readU32LE, readU64LE, readU128LE } from "../util/binary.js";

const MAX_SHAREHOLDERS = 64;
const MAX_FEE_TIERS = 64;

function bnI64(v: bigint | null): bigint {
  return v ?? 0n;
}

function bnU64(v: bigint | null): bigint {
  return v ?? 0n;
}

export function readFeesAt(data: Uint8Array, offset: number): { value: PumpFeesFees; next: number } | null {
  if (offset + 24 > data.length) return null;
  const lp_fee_bps = bnU64(readU64LE(data, offset));
  offset += 8;
  const protocol_fee_bps = bnU64(readU64LE(data, offset));
  offset += 8;
  const creator_fee_bps = bnU64(readU64LE(data, offset));
  offset += 8;
  return { value: { lp_fee_bps, protocol_fee_bps, creator_fee_bps }, next: offset };
}

export function readShareholdersVec(
  data: Uint8Array,
  offset: number
): { value: PumpFeesShareholder[]; next: number } | null {
  const n = readU32LE(data, offset);
  if (n === null || n > MAX_SHAREHOLDERS) return null;
  offset += 4;
  const value: PumpFeesShareholder[] = [];
  for (let i = 0; i < n; i++) {
    const address = readPubkey(data, offset);
    if (!address) return null;
    offset += 32;
    const share_bps = readU16LE(data, offset);
    if (share_bps === null) return null;
    offset += 2;
    value.push({ address, share_bps });
  }
  return { value, next: offset };
}

export function readFeeTiersVec(data: Uint8Array, offset: number): { value: PumpFeesFeeTier[]; next: number } | null {
  const n = readU32LE(data, offset);
  if (n === null || n > MAX_FEE_TIERS) return null;
  offset += 4;
  const value: PumpFeesFeeTier[] = [];
  for (let i = 0; i < n; i++) {
    const market_cap_lamports_threshold = readU128LE(data, offset);
    if (market_cap_lamports_threshold === null) return null;
    offset += 16;
    const fees = readFeesAt(data, offset);
    if (!fees) return null;
    offset = fees.next;
    value.push({ market_cap_lamports_threshold, fees: fees.value });
  }
  return { value, next: offset };
}

function readOptionPubkeyAt(data: Uint8Array, offset: number): { value?: string; next: number } | null {
  const tag = readU8(data, offset);
  if (tag === null) return null;
  offset += 1;
  if (tag === 0) return { value: undefined, next: offset };
  if (tag !== 1) return null;
  const value = readPubkey(data, offset);
  if (!value) return null;
  return { value, next: offset + 32 };
}

function readConfigStatusAt(data: Uint8Array, offset: number): { value: PumpFeesConfigStatus; next: number } | null {
  const tag = readU8(data, offset);
  if (tag === null) return null;
  if (tag === 0) return { value: "Paused", next: offset + 1 };
  if (tag === 1) return { value: "Active", next: offset + 1 };
  return null;
}

export function parseCreateFeeSharingConfigFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const timestamp = bnI64(readI64LE(data, o));
  if (o + 8 > data.length) return null;
  o += 8;
  const mint = readPubkey(data, o);
  if (!mint) return null;
  o += 32;
  const bonding_curve = readPubkey(data, o);
  if (!bonding_curve) return null;
  o += 32;
  const pool = readOptionPubkeyAt(data, o);
  if (!pool) return null;
  o = pool.next;
  const sharing_config = readPubkey(data, o);
  if (!sharing_config) return null;
  o += 32;
  const admin = readPubkey(data, o);
  if (!admin) return null;
  o += 32;
  const initial_shareholders = readShareholdersVec(data, o);
  if (!initial_shareholders) return null;
  o = initial_shareholders.next;
  const status = readConfigStatusAt(data, o);
  if (!status) return null;
  o = status.next;
  if (o !== data.length) return null;
  return {
    PumpFeesCreateFeeSharingConfig: {
      metadata,
      timestamp,
      mint,
      bonding_curve,
      pool: pool.value,
      sharing_config,
      admin,
      initial_shareholders: initial_shareholders.value,
      status: status.value,
    },
  };
}

export function parseInitializeFeeConfigFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  if (data.length !== 8 + 32 + 32) return null;
  let o = 0;
  const timestamp = bnI64(readI64LE(data, o));
  o += 8;
  const admin = readPubkey(data, o);
  if (!admin) return null;
  o += 32;
  const fee_config = readPubkey(data, o);
  if (!fee_config) return null;
  return { PumpFeesInitializeFeeConfig: { metadata, timestamp, admin, fee_config } };
}

export function parseResetFeeSharingConfigFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const timestamp = bnI64(readI64LE(data, o));
  if (o + 8 > data.length) return null;
  o += 8;
  const mint = readPubkey(data, o);
  if (!mint) return null;
  o += 32;
  const sharing_config = readPubkey(data, o);
  if (!sharing_config) return null;
  o += 32;
  const old_admin = readPubkey(data, o);
  if (!old_admin) return null;
  o += 32;
  const old_shareholders = readShareholdersVec(data, o);
  if (!old_shareholders) return null;
  o = old_shareholders.next;
  const new_admin = readPubkey(data, o);
  if (!new_admin) return null;
  o += 32;
  const new_shareholders = readShareholdersVec(data, o);
  if (!new_shareholders) return null;
  o = new_shareholders.next;
  if (o !== data.length) return null;
  return {
    PumpFeesResetFeeSharingConfig: {
      metadata,
      timestamp,
      mint,
      sharing_config,
      old_admin,
      old_shareholders: old_shareholders.value,
      new_admin,
      new_shareholders: new_shareholders.value,
    },
  };
}

export function parseRevokeFeeSharingAuthorityFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  if (data.length !== 8 + 32 + 32 + 32) return null;
  let o = 0;
  const timestamp = bnI64(readI64LE(data, o));
  o += 8;
  const mint = readPubkey(data, o);
  if (!mint) return null;
  o += 32;
  const sharing_config = readPubkey(data, o);
  if (!sharing_config) return null;
  o += 32;
  const admin = readPubkey(data, o);
  if (!admin) return null;
  return { PumpFeesRevokeFeeSharingAuthority: { metadata, timestamp, mint, sharing_config, admin } };
}

export function parseTransferFeeSharingAuthorityFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  if (data.length !== 8 + 32 + 32 + 32 + 32) return null;
  let o = 0;
  const timestamp = bnI64(readI64LE(data, o));
  o += 8;
  const mint = readPubkey(data, o);
  if (!mint) return null;
  o += 32;
  const sharing_config = readPubkey(data, o);
  if (!sharing_config) return null;
  o += 32;
  const old_admin = readPubkey(data, o);
  if (!old_admin) return null;
  o += 32;
  const new_admin = readPubkey(data, o);
  if (!new_admin) return null;
  return {
    PumpFeesTransferFeeSharingAuthority: { metadata, timestamp, mint, sharing_config, old_admin, new_admin },
  };
}

export function parseUpdateAdminFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  if (data.length !== 8 + 32 + 32) return null;
  let o = 0;
  const timestamp = bnI64(readI64LE(data, o));
  o += 8;
  const old_admin = readPubkey(data, o);
  if (!old_admin) return null;
  o += 32;
  const new_admin = readPubkey(data, o);
  if (!new_admin) return null;
  return { PumpFeesUpdateAdmin: { metadata, timestamp, old_admin, new_admin } };
}

export function parseUpdateFeeConfigFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const timestamp = bnI64(readI64LE(data, o));
  if (o + 8 > data.length) return null;
  o += 8;
  const admin = readPubkey(data, o);
  if (!admin) return null;
  o += 32;
  const fee_config = readPubkey(data, o);
  if (!fee_config) return null;
  o += 32;
  const fee_tiers = readFeeTiersVec(data, o);
  if (!fee_tiers) return null;
  o = fee_tiers.next;
  const flat_fees = readFeesAt(data, o);
  if (!flat_fees) return null;
  o = flat_fees.next;
  if (o !== data.length) return null;
  return {
    PumpFeesUpdateFeeConfig: {
      metadata,
      timestamp,
      admin,
      fee_config,
      fee_tiers: fee_tiers.value,
      flat_fees: flat_fees.value,
    },
  };
}

export function parseUpdateFeeSharesFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const timestamp = bnI64(readI64LE(data, o));
  if (o + 8 > data.length) return null;
  o += 8;
  const mint = readPubkey(data, o);
  if (!mint) return null;
  o += 32;
  const sharing_config = readPubkey(data, o);
  if (!sharing_config) return null;
  o += 32;
  const admin = readPubkey(data, o);
  if (!admin) return null;
  o += 32;
  const new_shareholders = readShareholdersVec(data, o);
  if (!new_shareholders) return null;
  o = new_shareholders.next;
  if (o !== data.length) return null;
  return {
    PumpFeesUpdateFeeShares: {
      metadata,
      timestamp,
      mint,
      sharing_config,
      admin,
      bonding_curve: defaultPubkey(),
      pump_creator_vault: defaultPubkey(),
      new_shareholders: new_shareholders.value,
    },
  };
}

export function parseUpsertFeeTiersFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const timestamp = bnI64(readI64LE(data, o));
  if (o + 8 > data.length) return null;
  o += 8;
  const admin = readPubkey(data, o);
  if (!admin) return null;
  o += 32;
  const fee_config = readPubkey(data, o);
  if (!fee_config) return null;
  o += 32;
  const fee_tiers = readFeeTiersVec(data, o);
  if (!fee_tiers) return null;
  o = fee_tiers.next;
  const offset = readU8(data, o);
  if (offset === null) return null;
  o += 1;
  if (o !== data.length) return null;
  return { PumpFeesUpsertFeeTiers: { metadata, timestamp, admin, fee_config, fee_tiers: fee_tiers.value, offset } };
}
