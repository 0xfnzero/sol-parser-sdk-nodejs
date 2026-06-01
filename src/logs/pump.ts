import type { EventMetadata } from "../core/metadata.js";
import type {
  DexEvent,
  PumpFunCreateTokenEvent,
  PumpFunMigrateBondingCurveCreatorEvent,
  PumpFunMigrateEvent,
  PumpFunTradeEvent,
} from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import {
  readBool,
  readBorshString,
  readDiscriminatorU64,
  readI64LE,
  readPubkey,
  readU16LE,
  readU32LE,
  readU64LE,
} from "../util/binary.js";

function disc(bytes: readonly number[]): bigint {
  const u8 = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) u8[i] = bytes[i]!;
  return readDiscriminatorU64(u8)!;
}

const DISC_CREATE = disc([27, 114, 169, 77, 222, 235, 99, 118]);
const DISC_TRADE = disc([189, 219, 127, 211, 78, 230, 97, 238]);
const DISC_MIGRATE = disc([189, 233, 93, 185, 92, 148, 234, 148]);
const DISC_MIGRATE_BONDING_CURVE_CREATOR = disc([155, 167, 104, 220, 213, 108, 243, 3]);

function normalizePumpfunIxName(ixName: string): string {
  if (ixName === "buy_v2") return "buy";
  if (ixName === "sell_v2") return "sell";
  if (ixName === "buy_exact_quote_in_v2") return "buy_exact_quote_in";
  return ixName;
}

function bnU64(v: bigint | null): bigint {
  return v ?? 0n;
}

function bnI64(v: bigint | null): bigint {
  return v ?? 0n;
}

function readOptionalU64(data: Uint8Array, offset: { value: number }): bigint {
  if (offset.value + 8 > data.length) return 0n;
  const value = bnU64(readU64LE(data, offset.value));
  offset.value += 8;
  return value;
}

function readOptionalPubkey(data: Uint8Array, offset: { value: number }): string {
  if (offset.value + 32 > data.length) return defaultPubkey();
  const value = readPubkey(data, offset.value) ?? defaultPubkey();
  offset.value += 32;
  return value;
}

function readTradeShareholders(data: Uint8Array, offset: { value: number }) {
  if (offset.value + 4 > data.length) return [];
  const n = readU32LE(data, offset.value);
  if (n === null || n > 64) return null;
  offset.value += 4;
  if (offset.value + n * 34 > data.length) return null;
  const out = [];
  for (let i = 0; i < n; i++) {
    const address = readPubkey(data, offset.value);
    if (!address) return null;
    offset.value += 32;
    const share_bps = readU16LE(data, offset.value);
    if (share_bps === null) return null;
    offset.value += 2;
    out.push({ address, share_bps });
  }
  return out;
}

export function parsePumpFunLogDecoded(programData: Uint8Array, metadata: EventMetadata): DexEvent | null {
  const disc = readDiscriminatorU64(programData);
  if (disc === null) return null;
  const data = programData.subarray(8);
  if (disc === DISC_CREATE) return parseCreateFromData(data, metadata);
  if (disc === DISC_TRADE) return parseTradeFromData(data, metadata, false);
  if (disc === DISC_MIGRATE) return parseMigrateFromData(data, metadata);
  if (disc === DISC_MIGRATE_BONDING_CURVE_CREATOR) {
    return parseMigrateBondingCurveCreatorFromData(data, metadata);
  }
  return null;
}

export function parseTradeFromData(data: Uint8Array, metadata: EventMetadata, isCreatedBuy: boolean): DexEvent | null {
  if (data.length < 32 + 8 + 8 + 1 + 32 + 8 * 5 + 32 + 8 + 8 + 32 + 8 + 8) return null;

  let o = 0;
  const mint = readPubkey(data, o);
  if (!mint) return null;
  o += 32;
  const sol_amount = bnU64(readU64LE(data, o));
  o += 8;
  const token_amount = bnU64(readU64LE(data, o));
  o += 8;
  const is_buy = readBool(data, o);
  if (is_buy === null) return null;
  o += 1;
  const user = readPubkey(data, o);
  if (!user) return null;
  o += 32;
  const timestamp = bnI64(readI64LE(data, o));
  o += 8;
  const virtual_sol_reserves = bnU64(readU64LE(data, o));
  o += 8;
  const virtual_token_reserves = bnU64(readU64LE(data, o));
  o += 8;
  const real_sol_reserves = bnU64(readU64LE(data, o));
  o += 8;
  const real_token_reserves = bnU64(readU64LE(data, o));
  o += 8;
  const fee_recipient = readPubkey(data, o);
  if (!fee_recipient) return null;
  o += 32;
  const fee_basis_points = bnU64(readU64LE(data, o));
  o += 8;
  const fee = bnU64(readU64LE(data, o));
  o += 8;
  const creator = readPubkey(data, o);
  if (!creator) return null;
  o += 32;
  const creator_fee_basis_points = bnU64(readU64LE(data, o));
  o += 8;
  const creator_fee = bnU64(readU64LE(data, o));
  o += 8;

  const track_volume = readBool(data, o) ?? false;
  o += 1;
  const total_unclaimed_tokens = o + 8 <= data.length ? bnU64(readU64LE(data, o)) : 0n;
  o += 8;
  const total_claimed_tokens = o + 8 <= data.length ? bnU64(readU64LE(data, o)) : 0n;
  o += 8;
  const current_sol_volume = o + 8 <= data.length ? bnU64(readU64LE(data, o)) : 0n;
  o += 8;
  const last_update_timestamp = o + 8 <= data.length ? bnI64(readI64LE(data, o)) : 0n;
  o += 8;

  let ix_name = "";
  if (o + 4 <= data.length) {
    const rs = readBorshString(data, o);
    if (rs) {
      ix_name = rs.s;
      o = rs.next;
    }
  }
  ix_name = normalizePumpfunIxName(ix_name);

  const mayhem_mode = readBool(data, o) ?? false;
  o += 1;
  const cashback_fee_basis_points = o + 8 <= data.length ? bnU64(readU64LE(data, o)) : 0n;
  o += 8;
  const cashback = o + 8 <= data.length ? bnU64(readU64LE(data, o)) : 0n;
  o += 8;

  const tail = { value: o };
  const buyback_fee_basis_points = readOptionalU64(data, tail);
  const buyback_fee = readOptionalU64(data, tail);
  const shareholders = readTradeShareholders(data, tail);
  if (shareholders === null) return null;
  const quote_mint = readOptionalPubkey(data, tail);
  const quote_amount = readOptionalU64(data, tail);
  const virtual_quote_reserves = readOptionalU64(data, tail);
  const real_quote_reserves = readOptionalU64(data, tail);

  const trade: PumpFunTradeEvent = {
    metadata,
    mint,
    sol_amount,
    token_amount,
    is_buy,
    is_created_buy: isCreatedBuy,
    user,
    timestamp,
    virtual_sol_reserves,
    virtual_token_reserves,
    real_sol_reserves,
    real_token_reserves,
    fee_recipient,
    fee_basis_points,
    fee,
    creator,
    creator_fee_basis_points,
    creator_fee,
    track_volume,
    total_unclaimed_tokens,
    total_claimed_tokens,
    current_sol_volume,
    last_update_timestamp,
    ix_name,
    mayhem_mode,
    cashback_fee_basis_points,
    cashback,
    buyback_fee_basis_points,
    buyback_fee,
    shareholders,
    quote_mint,
    quote_amount,
    virtual_quote_reserves,
    real_quote_reserves,
    is_cashback_coin: cashback_fee_basis_points > 0n,
    bonding_curve: defaultPubkey(),
    associated_bonding_curve: defaultPubkey(),
    token_program: defaultPubkey(),
    creator_vault: defaultPubkey(),
  };

  if (ix_name === "buy") return { PumpFunBuy: trade };
  if (ix_name === "sell") return { PumpFunSell: trade };
  if (ix_name === "buy_exact_sol_in") {
    return { PumpFunBuyExactSolIn: trade };
  }
  if (ix_name === "buy_exact_quote_in") return { PumpFunBuy: trade };
  return { PumpFunTrade: trade };
}

export function parseCreateFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  let o = 0;
  const n1 = readBorshString(data, o);
  if (!n1) return null;
  o = n1.next;
  const n2 = readBorshString(data, o);
  if (!n2) return null;
  o = n2.next;
  const n3 = readBorshString(data, o);
  if (!n3) return null;
  o = n3.next;
  if (data.length < o + 32 * 4 + 8 * 5 + 32 + 1) return null;

  const mint = readPubkey(data, o);
  if (!mint) return null;
  o += 32;
  const bonding_curve = readPubkey(data, o);
  if (!bonding_curve) return null;
  o += 32;
  const user = readPubkey(data, o);
  if (!user) return null;
  o += 32;
  const creator = readPubkey(data, o);
  if (!creator) return null;
  o += 32;
  const timestamp = bnI64(readI64LE(data, o));
  o += 8;
  const virtual_token_reserves = bnU64(readU64LE(data, o));
  o += 8;
  const virtual_sol_reserves = bnU64(readU64LE(data, o));
  o += 8;
  const real_token_reserves = bnU64(readU64LE(data, o));
  o += 8;
  const token_total_supply = bnU64(readU64LE(data, o));
  o += 8;
  const token_program = o + 32 <= data.length ? readPubkey(data, o)! : defaultPubkey();
  o += 32;
  const is_mayhem_mode = readBool(data, o) ?? false;
  o += 1;
  const is_cashback_enabled = readBool(data, o) ?? false;
  o += 1;
  const quote_mint = o + 32 <= data.length ? readPubkey(data, o)! : defaultPubkey();
  o += 32;
  const virtual_quote_reserves = o + 8 <= data.length ? bnU64(readU64LE(data, o)) : 0n;

  const ev: PumpFunCreateTokenEvent = {
    metadata,
    name: n1.s,
    symbol: n2.s,
    uri: n3.s,
    mint,
    bonding_curve,
    user,
    creator,
    timestamp,
    virtual_token_reserves,
    virtual_sol_reserves,
    real_token_reserves,
    token_total_supply,
    token_program,
    is_mayhem_mode,
    is_cashback_enabled,
    quote_mint,
    virtual_quote_reserves,
  };
  return { PumpFunCreate: ev };
}

export function parseMigrateFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  if (data.length < 32 + 32 + 8 + 8 + 8 + 32 + 8 + 32) return null;
  let o = 0;
  const user = readPubkey(data, o)!;
  o += 32;
  const mint = readPubkey(data, o)!;
  o += 32;
  const mint_amount = bnU64(readU64LE(data, o));
  o += 8;
  const sol_amount = bnU64(readU64LE(data, o));
  o += 8;
  const pool_migration_fee = bnU64(readU64LE(data, o));
  o += 8;
  const bonding_curve = readPubkey(data, o)!;
  o += 32;
  const timestamp = bnI64(readI64LE(data, o));
  o += 8;
  const pool = readPubkey(data, o)!;

  const ev: PumpFunMigrateEvent = {
    metadata,
    user,
    mint,
    mint_amount,
    sol_amount,
    pool_migration_fee,
    bonding_curve,
    timestamp,
    pool,
  };
  return { PumpFunMigrate: ev };
}

export function parseMigrateBondingCurveCreatorFromData(
  data: Uint8Array,
  metadata: EventMetadata
): DexEvent | null {
  if (data.length < 8 + 32 * 5) return null;
  let o = 0;
  const timestamp = bnI64(readI64LE(data, o));
  o += 8;
  const mint = readPubkey(data, o);
  if (!mint) return null;
  o += 32;
  const bonding_curve = readPubkey(data, o);
  if (!bonding_curve) return null;
  o += 32;
  const sharing_config = readPubkey(data, o);
  if (!sharing_config) return null;
  o += 32;
  const old_creator = readPubkey(data, o);
  if (!old_creator) return null;
  o += 32;
  const new_creator = readPubkey(data, o);
  if (!new_creator) return null;

  const ev: PumpFunMigrateBondingCurveCreatorEvent = {
    metadata,
    timestamp,
    mint,
    bonding_curve,
    sharing_config,
    old_creator,
    new_creator,
  };
  return { PumpFunMigrateBondingCurveCreator: ev };
}

/** u64 discriminator little-endian */
export function pumpDiscriminators() {
  return {
    CREATE: DISC_CREATE,
    TRADE: DISC_TRADE,
    MIGRATE: DISC_MIGRATE,
    MIGRATE_BONDING_CURVE_CREATOR: DISC_MIGRATE_BONDING_CURVE_CREATOR,
  };
}
