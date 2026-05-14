import type { EventMetadata } from "../core/metadata.js";
import type { DexEvent, PumpFunGlobal, PumpFunGlobalAccountEvent } from "../core/dex_event.js";
import type { AccountData } from "./types.js";
import { hasDiscriminator } from "./utils.js";
import { readPubkey, readU64LE, readU8 } from "../util/binary.js";
import { PUMPFUN_PROGRAM_ID } from "../instr/program_ids.js";

const GLOBAL_DISC = Uint8Array.from([167, 232, 232, 177, 200, 108, 114, 127]);
const GLOBAL_BODY = 1021;

export function isPumpfunGlobalAccount(data: Uint8Array): boolean {
  return hasDiscriminator(data, GLOBAL_DISC);
}

function readPubkeyArray(data: Uint8Array, offset: number, len: number): { value: string[]; next: number } | null {
  const value: string[] = [];
  let o = offset;
  for (let i = 0; i < len; i++) {
    const pubkey = readPubkey(data, o);
    if (pubkey === null) return null;
    value.push(pubkey);
    o += 32;
  }
  return { value, next: o };
}

export function parsePumpfunGlobal(account: AccountData, metadata: EventMetadata): DexEvent | null {
  if (account.data.length < 8 + GLOBAL_BODY) return null;
  if (!isPumpfunGlobalAccount(account.data)) return null;

  const d = account.data.subarray(8);
  let o = 0;

  const initializedByte = readU8(d, o);
  if (initializedByte === null) return null;
  const initialized = initializedByte !== 0;
  o += 1;

  const authority = readPubkey(d, o);
  if (authority === null) return null;
  o += 32;
  const fee_recipient = readPubkey(d, o);
  if (fee_recipient === null) return null;
  o += 32;
  const initial_virtual_token_reserves = readU64LE(d, o);
  if (initial_virtual_token_reserves === null) return null;
  o += 8;
  const initial_virtual_sol_reserves = readU64LE(d, o);
  if (initial_virtual_sol_reserves === null) return null;
  o += 8;
  const initial_real_token_reserves = readU64LE(d, o);
  if (initial_real_token_reserves === null) return null;
  o += 8;
  const token_total_supply = readU64LE(d, o);
  if (token_total_supply === null) return null;
  o += 8;
  const fee_basis_points = readU64LE(d, o);
  if (fee_basis_points === null) return null;
  o += 8;
  const withdraw_authority = readPubkey(d, o);
  if (withdraw_authority === null) return null;
  o += 32;
  const enableMigrateByte = readU8(d, o);
  if (enableMigrateByte === null) return null;
  const enable_migrate = enableMigrateByte !== 0;
  o += 1;
  const pool_migration_fee = readU64LE(d, o);
  if (pool_migration_fee === null) return null;
  o += 8;
  const creator_fee_basis_points = readU64LE(d, o);
  if (creator_fee_basis_points === null) return null;
  o += 8;
  const feeRecipients = readPubkeyArray(d, o, 8);
  if (feeRecipients === null) return null;
  const fee_recipients = feeRecipients.value;
  o = feeRecipients.next;
  const set_creator_authority = readPubkey(d, o);
  if (set_creator_authority === null) return null;
  o += 32;
  const admin_set_creator_authority = readPubkey(d, o);
  if (admin_set_creator_authority === null) return null;
  o += 32;
  const createV2EnabledByte = readU8(d, o);
  if (createV2EnabledByte === null) return null;
  const create_v2_enabled = createV2EnabledByte !== 0;
  o += 1;
  const whitelist_pda = readPubkey(d, o);
  if (whitelist_pda === null) return null;
  o += 32;
  const reserved_fee_recipient = readPubkey(d, o);
  if (reserved_fee_recipient === null) return null;
  o += 32;
  const mayhemModeEnabledByte = readU8(d, o);
  if (mayhemModeEnabledByte === null) return null;
  const mayhem_mode_enabled = mayhemModeEnabledByte !== 0;
  o += 1;
  const reservedFeeRecipients = readPubkeyArray(d, o, 7);
  if (reservedFeeRecipients === null) return null;
  const reserved_fee_recipients = reservedFeeRecipients.value;
  o = reservedFeeRecipients.next;
  const cashbackEnabledByte = readU8(d, o);
  if (cashbackEnabledByte === null) return null;
  o += 1;
  const buybackFeeRecipients = readPubkeyArray(d, o, 8);
  if (buybackFeeRecipients === null) return null;

  const global: PumpFunGlobal = {
    initialized,
    authority,
    fee_recipient,
    initial_virtual_token_reserves,
    initial_virtual_sol_reserves,
    initial_real_token_reserves,
    token_total_supply,
    fee_basis_points,
    withdraw_authority,
    enable_migrate,
    pool_migration_fee,
    creator_fee_basis_points,
    fee_recipients,
    set_creator_authority,
    admin_set_creator_authority,
    create_v2_enabled,
    whitelist_pda,
    reserved_fee_recipient,
    mayhem_mode_enabled,
    reserved_fee_recipients,
  };
  const ev: PumpFunGlobalAccountEvent = { metadata, pubkey: account.pubkey, global };
  return { PumpFunGlobalAccount: ev };
}

export function parsePumpfunAccount(account: AccountData, metadata: EventMetadata): DexEvent | null {
  if (account.owner !== PUMPFUN_PROGRAM_ID) return null;
  if (isPumpfunGlobalAccount(account.data)) return parsePumpfunGlobal(account, metadata);
  return null;
}
