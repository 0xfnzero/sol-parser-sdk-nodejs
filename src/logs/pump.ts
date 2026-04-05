import type { EventMetadata } from "../core/metadata.js";
import type { DexEvent, PumpFunCreateTokenEvent, PumpFunMigrateEvent, PumpFunTradeEvent } from "../core/dex_event.js";
import { defaultPubkey } from "../core/dex_event.js";
import {
  readBool,
  readBorshString,
  readDiscriminatorU64,
  readI64LE,
  readPubkey,
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

function bnU64(v: bigint | null): bigint {
  return v ?? 0n;
}

function bnI64(v: bigint | null): bigint {
  return v ?? 0n;
}

export function parsePumpFunLogDecoded(programData: Uint8Array, metadata: EventMetadata): DexEvent | null {
  const disc = readDiscriminatorU64(programData);
  if (disc === null) return null;
  const data = programData.subarray(8);
  if (disc === DISC_CREATE) return parseCreateFromData(data, metadata);
  if (disc === DISC_TRADE) return parseTradeFromData(data, metadata, false);
  if (disc === DISC_MIGRATE) return parseMigrateFromData(data, metadata);
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

  const mayhem_mode = readBool(data, o) ?? false;
  o += 1;
  const cashback_fee_basis_points = o + 8 <= data.length ? bnU64(readU64LE(data, o)) : 0n;
  o += 8;
  const cashback = o + 8 <= data.length ? bnU64(readU64LE(data, o)) : 0n;

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
    is_cashback_coin: cashback_fee_basis_points > 0n,
    bonding_curve: defaultPubkey(),
    associated_bonding_curve: defaultPubkey(),
    token_program: defaultPubkey(),
    creator_vault: defaultPubkey(),
  };

  if (ix_name === "buy") return { PumpFunBuy: trade };
  if (ix_name === "sell") return { PumpFunSell: trade };
  if (ix_name === "buy_exact_sol_in") return { PumpFunBuyExactSolIn: trade };
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

/** u64 discriminator little-endian */
export function pumpDiscriminators() {
  return { CREATE: DISC_CREATE, TRADE: DISC_TRADE, MIGRATE: DISC_MIGRATE };
}
