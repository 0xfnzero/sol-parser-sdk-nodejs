/** Raydium Launchpad / Bonk 日志解析 */
import type { EventMetadata } from "../core/metadata.js";
import type { BonkMigrateAmmEvent, BonkPoolCreateEvent, BonkTradeEvent, DexEvent } from "../core/dex_event.js";
import { readBool, readPubkey, readU64LE } from "../util/binary.js";

function disc(bytes: readonly number[]): bigint {
  const u8 = new Uint8Array(8);
  for (let i = 0; i < 8; i++) u8[i] = bytes[i]!;
  return new DataView(u8.buffer).getBigUint64(0, true);
}

export const BONK_DISC = {
  TRADE: disc([2, 3, 4, 5, 6, 7, 8, 9]),
  POOL_CREATE: disc([1, 2, 3, 4, 5, 6, 7, 8]),
  MIGRATE_AMM: disc([3, 4, 5, 6, 7, 8, 9, 10]),
};

function bn64(v: ReturnType<typeof readU64LE>): bigint {
  return v ?? 0n;
}

export function parseBonkTradeFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  if (data.length < 32 + 32 + 8 + 8 + 1 + 1) return null;
  let o = 0;
  const pool_state = readPubkey(data, o)!;
  o += 32;
  const user = readPubkey(data, o)!;
  o += 32;
  const amount_in = bn64(readU64LE(data, o));
  o += 8;
  const amount_out = bn64(readU64LE(data, o));
  o += 8;
  const is_buy = readBool(data, o)!;
  o += 1;
  const exact_in = readBool(data, o)!;
  const ev: BonkTradeEvent = {
    metadata,
    pool_state,
    user,
    amount_in,
    amount_out,
    is_buy,
    trade_direction: is_buy ? "Buy" : "Sell",
    exact_in,
  };
  return { BonkTrade: ev };
}

export function parseBonkPoolCreateFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  if (data.length < 32 + 32 + 32 + 32 + 8 + 8) return null;
  let o = 0;
  const pool_state = readPubkey(data, o)!;
  o += 32;
  o += 32;
  o += 32;
  const creator = readPubkey(data, o)!;
  o += 32;
  o += 8;
  o += 8;
  const ev: BonkPoolCreateEvent = {
    metadata,
    base_mint_param: { symbol: "BONK", name: "Bonk Pool", uri: "https://bonk.com", decimals: 5 },
    pool_state,
    creator,
  };
  return { BonkPoolCreate: ev };
}

export function parseBonkMigrateAmmFromData(data: Uint8Array, metadata: EventMetadata): DexEvent | null {
  if (data.length < 32 + 32 + 32 + 8) return null;
  let o = 0;
  const old_pool = readPubkey(data, o)!;
  o += 32;
  const new_pool = readPubkey(data, o)!;
  o += 32;
  const user = readPubkey(data, o)!;
  o += 32;
  const liquidity_amount = bn64(readU64LE(data, o));
  const ev: BonkMigrateAmmEvent = { metadata, old_pool, new_pool, user, liquidity_amount };
  return { BonkMigrateAmm: ev };
}

export function parseBonkFromDiscriminator(
  discriminator: bigint,
  data: Uint8Array,
  metadata: EventMetadata
): DexEvent | null {
  if (discriminator === BONK_DISC.TRADE) return parseBonkTradeFromData(data, metadata);
  if (discriminator === BONK_DISC.POOL_CREATE) return parseBonkPoolCreateFromData(data, metadata);
  if (discriminator === BONK_DISC.MIGRATE_AMM) return parseBonkMigrateAmmFromData(data, metadata);
  return null;
}
