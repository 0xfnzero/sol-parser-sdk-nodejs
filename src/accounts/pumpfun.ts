import type { EventMetadata } from "../core/metadata.js";
import type {
  DexEvent,
  PumpFunBondingCurve,
  PumpFunBondingCurveAccountEvent,
  PumpFunFeeConfig,
  PumpFunFeeConfigAccountEvent,
  PumpFunGlobal,
  PumpFunGlobalAccountEvent,
  PumpFunGlobalVolumeAccumulator,
  PumpFunGlobalVolumeAccumulatorAccountEvent,
  PumpFunSharingConfig,
  PumpFunSharingConfigAccountEvent,
  PumpFunUserVolumeAccumulator,
  PumpFunUserVolumeAccumulatorAccountEvent,
  PumpFeesFeeTier,
  PumpFeesFees,
  PumpFeesShareholder,
} from "../core/dex_event.js";
import type { AccountData } from "./types.js";
import { hasDiscriminator } from "./utils.js";
import { readI64LE, readPubkey, readU128LE, readU16LE, readU32LE, readU64LE, readU8 } from "../util/binary.js";
import { PUMP_FEES_PROGRAM_ID, PUMPFUN_PROGRAM_ID } from "../instr/program_ids.js";

const GLOBAL_DISC = Uint8Array.from([167, 232, 232, 177, 200, 108, 114, 127]);
const GLOBAL_BODY = 1037;
const BONDING_CURVE_DISC = Uint8Array.from([23, 183, 248, 55, 96, 216, 172, 96]);
const BONDING_CURVE_BODY = 107;
const FEE_CONFIG_DISC = Uint8Array.from([143, 52, 146, 187, 219, 123, 76, 155]);
const GLOBAL_VOLUME_ACCUMULATOR_DISC = Uint8Array.from([202, 42, 246, 43, 142, 190, 30, 255]);
const SHARING_CONFIG_DISC = Uint8Array.from([216, 74, 9, 0, 56, 140, 93, 75]);
const USER_VOLUME_ACCUMULATOR_DISC = Uint8Array.from([86, 255, 112, 14, 102, 53, 154, 250]);
const MAX_FEE_TIERS = 64;
const MAX_SHAREHOLDERS = 64;

export function isPumpfunGlobalAccount(data: Uint8Array): boolean {
  return hasDiscriminator(data, GLOBAL_DISC);
}

export function isPumpfunBondingCurveAccount(data: Uint8Array): boolean {
  return hasDiscriminator(data, BONDING_CURVE_DISC);
}

export function isPumpfunFeeConfigAccount(data: Uint8Array): boolean {
  return hasDiscriminator(data, FEE_CONFIG_DISC);
}

export function isPumpfunSharingConfigAccount(data: Uint8Array): boolean {
  return hasDiscriminator(data, SHARING_CONFIG_DISC);
}

export function isPumpfunGlobalVolumeAccumulatorAccount(data: Uint8Array): boolean {
  return hasDiscriminator(data, GLOBAL_VOLUME_ACCUMULATOR_DISC);
}

export function isPumpfunUserVolumeAccumulatorAccount(data: Uint8Array): boolean {
  return hasDiscriminator(data, USER_VOLUME_ACCUMULATOR_DISC);
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

function readFees(data: Uint8Array, offset: number): { value: PumpFeesFees; next: number } | null {
  const lp_fee_bps = readU64LE(data, offset);
  const protocol_fee_bps = readU64LE(data, offset + 8);
  const creator_fee_bps = readU64LE(data, offset + 16);
  if (lp_fee_bps === null || protocol_fee_bps === null || creator_fee_bps === null) return null;
  return { value: { lp_fee_bps, protocol_fee_bps, creator_fee_bps }, next: offset + 24 };
}

function readFeeTiers(data: Uint8Array, offset: number): { value: PumpFeesFeeTier[]; next: number } | null {
  const len = readU32LE(data, offset);
  if (len === null || len > MAX_FEE_TIERS) return null;
  let o = offset + 4;
  const value: PumpFeesFeeTier[] = [];
  for (let i = 0; i < len; i++) {
    const market_cap_lamports_threshold = readU128LE(data, o);
    if (market_cap_lamports_threshold === null) return null;
    o += 16;
    const fees = readFees(data, o);
    if (fees === null) return null;
    o = fees.next;
    value.push({ market_cap_lamports_threshold, fees: fees.value });
  }
  return { value, next: o };
}

function readShareholders(data: Uint8Array, offset: number): { value: PumpFeesShareholder[]; next: number } | null {
  const len = readU32LE(data, offset);
  if (len === null || len > MAX_SHAREHOLDERS) return null;
  let o = offset + 4;
  const value: PumpFeesShareholder[] = [];
  for (let i = 0; i < len; i++) {
    const address = readPubkey(data, o);
    if (address === null) return null;
    o += 32;
    const share_bps = readU16LE(data, o);
    if (share_bps === null) return null;
    o += 2;
    value.push({ address, share_bps });
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
  const feeRecipients = readPubkeyArray(d, o, 7);
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
  const is_cashback_enabled = cashbackEnabledByte !== 0;
  o += 1;
  const buybackFeeRecipients = readPubkeyArray(d, o, 8);
  if (buybackFeeRecipients === null) return null;
  const buyback_fee_recipients = buybackFeeRecipients.value;
  o = buybackFeeRecipients.next;
  const buyback_basis_points = readU64LE(d, o);
  if (buyback_basis_points === null) return null;
  o += 8;
  const initial_virtual_quote_reserves = readU64LE(d, o);
  if (initial_virtual_quote_reserves === null) return null;
  o += 8;
  const whitelistedQuoteMints = readPubkeyArray(d, o, 1);
  if (whitelistedQuoteMints === null) return null;
  const whitelisted_quote_mints = whitelistedQuoteMints.value;

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
    is_cashback_enabled,
    buyback_fee_recipients,
    buyback_basis_points,
    initial_virtual_quote_reserves,
    whitelisted_quote_mints,
  };
  const ev: PumpFunGlobalAccountEvent = { metadata, pubkey: account.pubkey, global };
  return { PumpFunGlobalAccount: ev };
}

export function parsePumpfunBondingCurve(account: AccountData, metadata: EventMetadata): DexEvent | null {
  if (account.data.length < 8 + BONDING_CURVE_BODY) return null;
  if (!isPumpfunBondingCurveAccount(account.data)) return null;

  const d = account.data.subarray(8);
  let o = 0;

  const virtual_token_reserves = readU64LE(d, o);
  if (virtual_token_reserves === null) return null;
  o += 8;
  const virtual_quote_reserves = readU64LE(d, o);
  if (virtual_quote_reserves === null) return null;
  o += 8;
  const real_token_reserves = readU64LE(d, o);
  if (real_token_reserves === null) return null;
  o += 8;
  const real_quote_reserves = readU64LE(d, o);
  if (real_quote_reserves === null) return null;
  o += 8;
  const token_total_supply = readU64LE(d, o);
  if (token_total_supply === null) return null;
  o += 8;
  const completeByte = readU8(d, o);
  if (completeByte === null) return null;
  const complete = completeByte !== 0;
  o += 1;
  const creator = readPubkey(d, o);
  if (creator === null) return null;
  o += 32;
  const mayhemModeByte = readU8(d, o);
  if (mayhemModeByte === null) return null;
  const is_mayhem_mode = mayhemModeByte !== 0;
  o += 1;
  const cashbackCoinByte = readU8(d, o);
  if (cashbackCoinByte === null) return null;
  const is_cashback_coin = cashbackCoinByte !== 0;
  o += 1;
  const quote_mint = readPubkey(d, o);
  if (quote_mint === null) return null;

  const bonding_curve: PumpFunBondingCurve = {
    virtual_token_reserves,
    virtual_quote_reserves,
    real_token_reserves,
    real_quote_reserves,
    token_total_supply,
    complete,
    creator,
    is_mayhem_mode,
    is_cashback_coin,
    quote_mint,
  };
  const ev: PumpFunBondingCurveAccountEvent = {
    metadata,
    pubkey: account.pubkey,
    bonding_curve,
  };
  return { PumpFunBondingCurveAccount: ev };
}

export function parsePumpfunFeeConfig(account: AccountData, metadata: EventMetadata): DexEvent | null {
  if (!isPumpfunFeeConfigAccount(account.data)) return null;
  const d = account.data.subarray(8);
  let o = 0;
  const bump = readU8(d, o);
  if (bump === null) return null;
  o += 1;
  const admin = readPubkey(d, o);
  if (admin === null) return null;
  o += 32;
  const flatFees = readFees(d, o);
  if (flatFees === null) return null;
  o = flatFees.next;
  const feeTiers = readFeeTiers(d, o);
  if (feeTiers === null) return null;
  o = feeTiers.next;
  const stableFeeTiers = readFeeTiers(d, o);
  if (stableFeeTiers === null) return null;

  const fee_config: PumpFunFeeConfig = {
    bump,
    admin,
    flat_fees: flatFees.value,
    fee_tiers: feeTiers.value,
    stable_fee_tiers: stableFeeTiers.value,
  };
  const ev: PumpFunFeeConfigAccountEvent = { metadata, pubkey: account.pubkey, fee_config };
  return { PumpFunFeeConfigAccount: ev };
}

export function parsePumpfunSharingConfig(account: AccountData, metadata: EventMetadata): DexEvent | null {
  if (!isPumpfunSharingConfigAccount(account.data)) return null;
  const d = account.data.subarray(8);
  let o = 0;
  const bump = readU8(d, o);
  if (bump === null) return null;
  o += 1;
  const version = readU8(d, o);
  if (version === null) return null;
  o += 1;
  const statusByte = readU8(d, o);
  if (statusByte === null || statusByte > 1) return null;
  const status = statusByte === 0 ? "Paused" : "Active";
  o += 1;
  const mint = readPubkey(d, o);
  if (mint === null) return null;
  o += 32;
  const admin = readPubkey(d, o);
  if (admin === null) return null;
  o += 32;
  const adminRevokedByte = readU8(d, o);
  if (adminRevokedByte === null) return null;
  const admin_revoked = adminRevokedByte !== 0;
  o += 1;
  const shareholders = readShareholders(d, o);
  if (shareholders === null) return null;

  const sharing_config: PumpFunSharingConfig = {
    bump,
    version,
    status,
    mint,
    admin,
    admin_revoked,
    shareholders: shareholders.value,
  };
  const ev: PumpFunSharingConfigAccountEvent = { metadata, pubkey: account.pubkey, sharing_config };
  return { PumpFunSharingConfigAccount: ev };
}

export function parsePumpfunGlobalVolumeAccumulator(account: AccountData, metadata: EventMetadata): DexEvent | null {
  if (!isPumpfunGlobalVolumeAccumulatorAccount(account.data)) return null;
  const d = account.data.subarray(8);
  let o = 0;
  const start_time = readI64LE(d, o);
  if (start_time === null) return null;
  o += 8;
  const end_time = readI64LE(d, o);
  if (end_time === null) return null;
  o += 8;
  const seconds_in_a_day = readI64LE(d, o);
  if (seconds_in_a_day === null) return null;
  o += 8;
  const mint = readPubkey(d, o);
  if (mint === null) return null;
  o += 32;
  const total_token_supply: bigint[] = [];
  for (let i = 0; i < 30; i++) {
    const value = readU64LE(d, o);
    if (value === null) return null;
    o += 8;
    total_token_supply.push(value);
  }
  const sol_volumes: bigint[] = [];
  for (let i = 0; i < 30; i++) {
    const value = readU64LE(d, o);
    if (value === null) return null;
    o += 8;
    sol_volumes.push(value);
  }

  const global_volume_accumulator: PumpFunGlobalVolumeAccumulator = {
    start_time,
    end_time,
    seconds_in_a_day,
    mint,
    total_token_supply,
    sol_volumes,
  };
  const ev: PumpFunGlobalVolumeAccumulatorAccountEvent = {
    metadata,
    pubkey: account.pubkey,
    global_volume_accumulator,
  };
  return { PumpFunGlobalVolumeAccumulatorAccount: ev };
}

export function parsePumpfunUserVolumeAccumulator(account: AccountData, metadata: EventMetadata): DexEvent | null {
  if (!isPumpfunUserVolumeAccumulatorAccount(account.data)) return null;
  const d = account.data.subarray(8);
  let o = 0;
  const user = readPubkey(d, o);
  if (user === null) return null;
  o += 32;
  const needsClaimByte = readU8(d, o);
  if (needsClaimByte === null) return null;
  const needs_claim = needsClaimByte !== 0;
  o += 1;
  const total_unclaimed_tokens = readU64LE(d, o);
  if (total_unclaimed_tokens === null) return null;
  o += 8;
  const total_claimed_tokens = readU64LE(d, o);
  if (total_claimed_tokens === null) return null;
  o += 8;
  const current_sol_volume = readU64LE(d, o);
  if (current_sol_volume === null) return null;
  o += 8;
  const last_update_timestamp = readI64LE(d, o);
  if (last_update_timestamp === null) return null;
  o += 8;
  const hasTotalClaimedTokensByte = readU8(d, o);
  if (hasTotalClaimedTokensByte === null) return null;
  const has_total_claimed_tokens = hasTotalClaimedTokensByte !== 0;
  o += 1;
  const cashback_earned = readU64LE(d, o);
  if (cashback_earned === null) return null;
  o += 8;
  const total_cashback_claimed = readU64LE(d, o);
  if (total_cashback_claimed === null) return null;
  o += 8;
  const stable_cashback_earned = readU64LE(d, o);
  if (stable_cashback_earned === null) return null;
  o += 8;
  const total_stable_cashback_claimed = readU64LE(d, o);
  if (total_stable_cashback_claimed === null) return null;

  const user_volume_accumulator: PumpFunUserVolumeAccumulator = {
    user,
    needs_claim,
    total_unclaimed_tokens,
    total_claimed_tokens,
    current_sol_volume,
    last_update_timestamp,
    has_total_claimed_tokens,
    cashback_earned,
    total_cashback_claimed,
    stable_cashback_earned,
    total_stable_cashback_claimed,
  };
  const ev: PumpFunUserVolumeAccumulatorAccountEvent = {
    metadata,
    pubkey: account.pubkey,
    user_volume_accumulator,
  };
  return { PumpFunUserVolumeAccumulatorAccount: ev };
}

export function parsePumpfunAccount(account: AccountData, metadata: EventMetadata): DexEvent | null {
  if (account.owner !== PUMPFUN_PROGRAM_ID && account.owner !== PUMP_FEES_PROGRAM_ID) return null;
  if (isPumpfunFeeConfigAccount(account.data)) return parsePumpfunFeeConfig(account, metadata);
  if (isPumpfunSharingConfigAccount(account.data)) return parsePumpfunSharingConfig(account, metadata);
  if (isPumpfunGlobalVolumeAccumulatorAccount(account.data)) {
    return parsePumpfunGlobalVolumeAccumulator(account, metadata);
  }
  if (isPumpfunUserVolumeAccumulatorAccount(account.data)) {
    return parsePumpfunUserVolumeAccumulator(account, metadata);
  }
  if (isPumpfunBondingCurveAccount(account.data)) return parsePumpfunBondingCurve(account, metadata);
  if (isPumpfunGlobalAccount(account.data)) return parsePumpfunGlobal(account, metadata);
  return null;
}
