import type { EventMetadata } from "../core/metadata.js";
import type {
  DexEvent,
  PumpSwapGlobalConfig,
  PumpSwapGlobalConfigAccountEvent,
  PumpSwapPool,
  PumpSwapPoolAccountEvent,
} from "../core/dex_event.js";
import type { AccountData } from "./types.js";
import { hasDiscriminator } from "./utils.js";
import { readPubkey, readU64LE, readU16LE, readU8 } from "../util/binary.js";
import { PUMPSWAP_PROGRAM_ID } from "../instr/program_ids.js";

const GLOBAL_DISC = Uint8Array.from([149, 8, 156, 202, 160, 252, 176, 217]);
const POOL_DISC = Uint8Array.from([241, 154, 109, 4, 17, 177, 109, 188]);

const GLOBAL_BODY = 634;
const POOL_BODY = 244;

export function isGlobalConfigAccount(data: Uint8Array): boolean {
  return hasDiscriminator(data, GLOBAL_DISC);
}

export function isPoolAccount(data: Uint8Array): boolean {
  return hasDiscriminator(data, POOL_DISC);
}

export function parsePumpswapGlobalConfig(account: AccountData, metadata: EventMetadata): DexEvent | null {
  if (account.data.length < 8 + GLOBAL_BODY) return null;
  if (!isGlobalConfigAccount(account.data)) return null;
  const d = account.data.subarray(8);
  let o = 0;
  const admin = readPubkey(d, o);
  if (admin === null) return null;
  o += 32;
  const lp_fee_basis_points = readU64LE(d, o);
  if (lp_fee_basis_points === null) return null;
  o += 8;
  const protocol_fee_basis_points = readU64LE(d, o);
  if (protocol_fee_basis_points === null) return null;
  o += 8;
  const disable_flags = readU8(d, o);
  if (disable_flags === null) return null;
  o += 1;
  const protocol_fee_recipients: string[] = [];
  for (let i = 0; i < 8; i++) {
    const pk = readPubkey(d, o);
    if (pk === null) return null;
    protocol_fee_recipients.push(pk);
    o += 32;
  }
  const coin_creator_fee_basis_points = readU64LE(d, o);
  if (coin_creator_fee_basis_points === null) return null;
  o += 8;
  const admin_set_coin_creator_authority = readPubkey(d, o);
  if (admin_set_coin_creator_authority === null) return null;
  o += 32;
  const whitelist_pda = readPubkey(d, o);
  if (whitelist_pda === null) return null;
  o += 32;
  const reserved_fee_recipient = readPubkey(d, o);
  if (reserved_fee_recipient === null) return null;
  o += 32;
  const mayhem_b = readU8(d, o);
  if (mayhem_b === null) return null;
  const mayhem_mode_enabled = mayhem_b !== 0;
  o += 1;
  const reserved_fee_recipients: string[] = [];
  for (let i = 0; i < 7; i++) {
    const pk = readPubkey(d, o);
    if (pk === null) return null;
    reserved_fee_recipients.push(pk);
    o += 32;
  }
  const global_config: PumpSwapGlobalConfig = {
    admin,
    lp_fee_basis_points,
    protocol_fee_basis_points,
    disable_flags,
    protocol_fee_recipients,
    coin_creator_fee_basis_points,
    admin_set_coin_creator_authority,
    whitelist_pda,
    reserved_fee_recipient,
    mayhem_mode_enabled,
    reserved_fee_recipients,
  };
  const ev: PumpSwapGlobalConfigAccountEvent = {
    metadata,
    pubkey: account.pubkey,
    executable: account.executable,
    lamports: account.lamports,
    owner: account.owner,
    rent_epoch: account.rent_epoch,
    global_config,
  };
  return { PumpSwapGlobalConfigAccount: ev };
}

export function parsePumpswapPool(account: AccountData, metadata: EventMetadata): DexEvent | null {
  if (account.data.length < 8 + POOL_BODY) return null;
  if (!isPoolAccount(account.data)) return null;
  const d = account.data.subarray(8);
  let o = 0;
  const pool_bump = readU8(d, o);
  if (pool_bump === null) return null;
  o += 1;
  const index = readU16LE(d, o);
  if (index === null) return null;
  o += 2;
  const creator = readPubkey(d, o);
  if (creator === null) return null;
  o += 32;
  const base_mint = readPubkey(d, o);
  if (base_mint === null) return null;
  o += 32;
  const quote_mint = readPubkey(d, o);
  if (quote_mint === null) return null;
  o += 32;
  const lp_mint = readPubkey(d, o);
  if (lp_mint === null) return null;
  o += 32;
  const pool_base_token_account = readPubkey(d, o);
  if (pool_base_token_account === null) return null;
  o += 32;
  const pool_quote_token_account = readPubkey(d, o);
  if (pool_quote_token_account === null) return null;
  o += 32;
  const lp_supply = readU64LE(d, o);
  if (lp_supply === null) return null;
  o += 8;
  const coin_creator = readPubkey(d, o);
  if (coin_creator === null) return null;
  o += 32;
  const mayhem = readU8(d, o);
  if (mayhem === null) return null;
  o += 1;
  const cashback = readU8(d, o);
  if (cashback === null) return null;
  const pool: PumpSwapPool = {
    pool_bump,
    index,
    creator,
    base_mint,
    quote_mint,
    lp_mint,
    pool_base_token_account,
    pool_quote_token_account,
    lp_supply,
    coin_creator,
    is_mayhem_mode: mayhem !== 0,
    is_cashback_coin: cashback !== 0,
  };
  const ev: PumpSwapPoolAccountEvent = {
    metadata,
    pubkey: account.pubkey,
    executable: account.executable,
    lamports: account.lamports,
    owner: account.owner,
    rent_epoch: account.rent_epoch,
    pool,
  };
  return { PumpSwapPoolAccount: ev };
}

export function parsePumpswapAccount(account: AccountData, metadata: EventMetadata): DexEvent | null {
  if (account.owner !== PUMPSWAP_PROGRAM_ID) return null;
  if (isGlobalConfigAccount(account.data)) return parsePumpswapGlobalConfig(account, metadata);
  if (isPoolAccount(account.data)) return parsePumpswapPool(account, metadata);
  return null;
}
